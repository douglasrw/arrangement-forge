// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes, useLocation } from 'react-router-dom';
import { AuthGuard, createAppRoutes } from './App';
import { useAuthStore } from '@/store/auth-store';

vi.mock('@/pages/LoginPage', () => ({
  default: () => <div data-testid="login-page">Login page</div>,
}));

vi.mock('@/pages/LibraryPage', () => ({
  default: () => <div data-testid="library-page">Library page</div>,
}));

vi.mock('@/pages/EditorPage', () => ({
  default: ({ routeMode }: { routeMode?: 'project-selection' | 'project-id' }) => (
    <div data-testid="editor-page" data-route-mode={routeMode ?? 'project-id'}>
      Editor page
    </div>
  ),
}));

vi.mock('@/pages/SettingsPage', () => ({
  default: () => <div data-testid="settings-page">Settings page</div>,
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProfile() {
  return {
    id: 'user-1',
    displayName: 'Ashlyn',
    chordDisplayMode: 'roman' as const,
    defaultGenre: 'Pop',
    createdAt: '2026-03-29T00:00:00Z',
    updatedAt: '2026-03-29T01:00:00Z',
  };
}

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
            path="/project"
            element={
              <AuthGuard>
                <div data-testid="editor-page">Editor page</div>
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
    'user' | 'profile' | 'authStatus' | 'signedOutReason'
  >
) {
  useAuthStore.setState(state);
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
      user: null,
      profile: null,
    });

    const mounted = renderRoute('/settings');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/settings');
    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Waiting on authentication');
    expect(mounted.container.textContent).toContain('Current state: Checking for an existing session.');
    expect(mounted.container.textContent).toContain('Wait for session bootstrap.');
    expect(mounted.container.textContent).toContain('continue to settings');
    expect(mounted.container.textContent).toContain(
      'Route readiness: /settings is reserved until authentication finishes.'
    );
    expect(mounted.container.textContent).toContain('Current route: /settings');
    expect(mounted.container.textContent).toContain(
      'Route truth: /settings stays reserved until authentication finishes.'
    );
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="settings-page"]')).toBeNull();
  });

  it('names the requested editor destination during auth bootstrap', () => {
    setAuthStoreFixture({
      authStatus: 'checking-session',
      signedOutReason: null,
      user: null,
      profile: null,
    });

    const mounted = renderRoute('/project/project-1?tab=arrangement#bridge');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('continue to project project-1 in the editor');
    expect(mounted.container.textContent).toContain(
      'Route readiness: /project/project-1 is reserved until authentication finishes.'
    );
    expect(mounted.container.textContent).toContain(
      'Current route: /project/project-1?tab=arrangement#bridge'
    );
    expect(mounted.container.textContent).toContain('Editor fallback route: /project');
    expect(mounted.container.textContent).toContain(
      'Route truth: /project/project-1 stays reserved during authentication, and /project remains the editor fallback route if you need to choose a different project after recovery.'
    );
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="editor-page"]')).toBeNull();
  });

  it('keeps the editor fallback route explicit during auth bootstrap', () => {
    setAuthStoreFixture({
      authStatus: 'checking-session',
      signedOutReason: null,
      user: null,
      profile: null,
    });

    const mounted = renderRoute('/project');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('continue to project selection in the editor');
    expect(mounted.container.textContent).toContain(
      'Route readiness: /project is reserved as the editor fallback route until authentication finishes.'
    );
    expect(mounted.container.textContent).toContain('Current route: /project');
    expect(mounted.container.textContent).toContain('Editor fallback route: /project');
    expect(mounted.container.textContent).toContain(
      'Route truth: /project is the editor fallback route, and it stays reserved until authentication finishes and you can choose a project.'
    );
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="editor-page"]')).toBeNull();
  });

  it('keeps the exact fallback editor route visible during auth bootstrap', () => {
    setAuthStoreFixture({
      authStatus: 'checking-session',
      signedOutReason: null,
      user: null,
      profile: null,
    });

    const mounted = renderRoute('/project?tab=arrangement#new');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('continue to project selection in the editor');
    expect(mounted.container.textContent).toContain(
      'Route readiness: /project is reserved as the editor fallback route until authentication finishes.'
    );
    expect(mounted.container.textContent).toContain(
      'Current route: /project?tab=arrangement#new'
    );
    expect(mounted.container.textContent).toContain('Editor fallback route: /project');
    expect(mounted.container.textContent).toContain(
      'Route truth: /project is the editor fallback route, and it stays reserved until authentication finishes and you can choose a project.'
    );
    expect(mounted.container.querySelector('[data-testid="login-page"]')).toBeNull();
    expect(mounted.container.querySelector('[data-testid="editor-page"]')).toBeNull();
  });

  it('keeps authenticated users on the requested protected route', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: makeProfile(),
      authStatus: 'authenticated',
      signedOutReason: null,
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

  it('routes /project through the guarded editor surface instead of leaving the fallback unreachable', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: makeProfile(),
      authStatus: 'authenticated',
      signedOutReason: null,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const router = createMemoryRouter(createAppRoutes(), {
      initialEntries: ['/project'],
    });

    mountedRoot = root;
    mountedContainer = container;

    act(() => {
      root.render(<RouterProvider router={router} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(router.state.location.pathname).toBe('/project');
    expect(container.querySelector('[data-testid="editor-page"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="editor-page"]')?.getAttribute('data-route-mode')).toBe(
      'project-selection'
    );
  });

  it('removes protected content immediately after auth state is cleared', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: makeProfile(),
      authStatus: 'authenticated',
      signedOutReason: null,
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

  it('redirects incomplete authenticated state back to login instead of treating it as granted', async () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: null,
      authStatus: 'authenticated',
      signedOutReason: null,
    });

    const mounted = renderRoute('/project/project-1');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/login');
    expect(mounted.container.querySelector('[data-testid="location-redirect"]')?.textContent).toBe('/project/project-1');
    expect(mounted.container.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="editor-page"]')).toBeNull();
  });
});
