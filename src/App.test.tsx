// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthGuard } from './App';
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
  return <div data-testid="location-path">{location.pathname}</div>;
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

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({
    user: null,
    profile: null,
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
  it('redirects unauthenticated users from protected routes back to login', async () => {
    const mounted = renderRoute('/library');
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await Promise.resolve();
    });

    expect(mounted.container.querySelector('[data-testid="location-path"]')?.textContent).toBe('/login');
    expect(mounted.container.querySelector('[data-testid="login-page"]')).not.toBeNull();
    expect(mounted.container.querySelector('[data-testid="library-page"]')).toBeNull();
  });

  it('shows the loading gate without flashing login or protected content during bootstrap', () => {
    useAuthStore.setState({
      isLoading: true,
      isAuthenticated: false,
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
    useAuthStore.setState({
      user: { id: 'user-1', email: 'ash@example.com' },
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
});
