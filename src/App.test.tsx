// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthGuard } from './App';
import { getAuthGateTruth } from '@/store/auth-store';
import { getAuthTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login page</div>,
}));

vi.mock('@/pages/LibraryPage', () => ({
  default: () => <div data-testid="library-page">Library page</div>,
}));

vi.mock('@/pages/EditorPage', () => ({
  default: () => <div data-testid="editor-page">Editor page</div>,
}));

vi.mock('@/pages/SettingsPage', () => ({
  default: () => <div data-testid="settings-page">Settings page</div>,
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function LocationProbe() {
  const location = useLocation();
  const redirectTo = (
    location.state
    && typeof location.state === 'object'
    && 'redirectTo' in location.state
    && typeof (location.state as { redirectTo?: unknown }).redirectTo === 'string'
  )
    ? (location.state as { redirectTo: string }).redirectTo
    : '';

  return (
    <>
      <div data-testid="location-path">{location.pathname}</div>
      <div data-testid="location-redirect">{redirectTo}</div>
    </>
  );
}

function renderRoute(initialEntry: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login page</div>} />
          <Route
            path="/library"
            element={
              <AuthGuard>
                <div data-testid="library-page">Library page</div>
              </AuthGuard>
            }
          />
          <Route
            path="/project/:id"
            element={
              <AuthGuard>
                <div data-testid="editor-page">Editor page</div>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <div data-testid="settings-page">Settings page</div>
              </AuthGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  });

  return { container, root };
}

function setAuthStoreFixture(
  state: Pick<
    ReturnType<typeof useAuthStore.getState>,
    'user' | 'profile' | 'authStatus' | 'signedOutReason' | 'isLoading' | 'isAuthenticated'
  >
) {
  useAuthStore.setState({
    ...state,
    authTruth: getAuthTruth(state),
    authGate: getAuthGateTruth(state),
  });
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  setAuthStoreFixture({
    user: null,
    profile: null,
    authStatus: 'signed-out',
    signedOutReason: 'no-session',
    isLoading: false,
    isAuthenticated: false,
  });
});

afterEach(() => {
  if (mountedRoot && mountedContainer) {
    act(() => {
      mountedRoot?.unmount();
    });
    mountedContainer.remove();
  }

  mountedRoot = null;
  mountedContainer = null;
});

describe('App protected route recovery truth', () => {
  it('redirects unauthenticated users from protected routes back to login with the original destination', async () => {
    const mounted = renderRoute('/project/project-1?tab=arrangement#bridge');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/login');
    expect(mounted.container.querySelector('[data-testid="location-redirect"]')?.textContent).toBe('/project/project-1?tab=arrangement#bridge');
    expect(mounted.container.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="library-page"]')).toBeNull();
  });

  it('shows the loading gate without flashing login or protected content during bootstrap', () => {
    setAuthStoreFixture({
      authStatus: 'checking-session',
      signedOutReason: null,
      isLoading: true,
      isAuthenticated: false,
      user: null,
      profile: null,
    });

    const mounted = renderRoute('/settings');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/settings');
    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="settings-page"]')).toBeNull();
  });

  it('keeps authenticated users on the requested protected route', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: null,
      authStatus: 'authenticated',
      signedOutReason: null,
      isAuthenticated: true,
      isLoading: false,
    });

    const mounted = renderRoute('/project/project-1');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/project/project-1');
    expect(mounted.container.querySelector('[data-testid="editor-page"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
  });

  it('removes protected content immediately after auth state is cleared', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: null,
      authStatus: 'authenticated',
      signedOutReason: null,
      isAuthenticated: true,
      isLoading: false,
    });

    const mounted = renderRoute('/settings');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="settings-page"]')).not.toBeNull();

    act(() => {
      useAuthStore.getState().setSignedOut('signed-out');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/login');
    expect(mounted.container.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="settings-page"]')).toBeNull();
  });
});
