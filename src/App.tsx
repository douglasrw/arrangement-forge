import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AuthTruth } from '@/store/auth-store';
import { selectAuthTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import EditorPage from '@/pages/EditorPage';
import LoginPage from '@/pages/LoginPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';

function describeProtectedDestination(path: string) {
  const routePath = path.split(/[?#]/, 1)[0] ?? path;

  if (routePath === '/project') {
    return 'project selection in the editor';
  }

  if (routePath.startsWith('/project/')) {
    const [, , projectId] = routePath.split('/');
    return projectId ? `project ${projectId} in the editor` : 'the requested project in the editor';
  }

  if (routePath.startsWith('/settings')) {
    return 'settings';
  }

  if (routePath.startsWith('/library')) {
    return 'the library';
  }

  return 'your workspace';
}

function describeProtectedRecoveryTruth(path: string) {
  const routePath = path.split(/[?#]/, 1)[0] ?? path;

  if (routePath === '/project') {
    return 'Route truth: /project is the editor fallback route, and it stays reserved until authentication finishes and you can choose a project.';
  }

  if (routePath.startsWith('/project/')) {
    return 'Route truth: the requested editor project route stays reserved during authentication, and /project remains the editor fallback route if you need to choose a different project after recovery.';
  }

  if (routePath.startsWith('/settings')) {
    return 'Route truth: the protected settings route stays reserved until authentication finishes.';
  }

  if (routePath.startsWith('/library')) {
    return 'Route truth: the protected library route stays reserved until authentication finishes.';
  }

  return 'Route truth: this protected workspace route stays reserved until authentication finishes.';
}

function describeProtectedRouteLabel(path: string) {
  return path || '/';
}

function describeProtectedFallbackRoute(path: string) {
  const routePath = path.split(/[?#]/, 1)[0] ?? path;

  if (routePath === '/project' || routePath.startsWith('/project/')) {
    return '/project';
  }

  return null;
}

function LoadingScreen({
  authTruth,
  recoveryPath,
}: {
  authTruth: AuthTruth;
  recoveryPath: string;
}) {
  const recoveryDestination = describeProtectedDestination(recoveryPath);
  const recoveryTruth = describeProtectedRecoveryTruth(recoveryPath);
  const currentRoute = describeProtectedRouteLabel(recoveryPath);
  const fallbackRoute = describeProtectedFallbackRoute(recoveryPath);

  return (
    <div
      data-testid="auth-loading-screen"
      className="min-h-screen bg-background flex items-center justify-center p-4"
    >
      <div className="bg-card shadow-xl w-full max-w-sm border border-border rounded-lg p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <div className="space-y-1">
            <h1 className="text-base font-semibold text-foreground">Waiting on authentication</h1>
            <p className="text-sm text-muted-foreground">
              Current state: {authTruth.currentState} Next step: {authTruth.nextStepLabel}.{' '}
              {authTruth.nextStepDetail} If a session is restored, Arrangement Forge will continue
              to {recoveryDestination}.
            </p>
            <p className="text-xs text-foreground/80">Current route: {currentRoute}</p>
            {fallbackRoute ? (
              <p className="text-xs text-foreground/80">Editor fallback route: {fallbackRoute}</p>
            ) : null}
            <p className="text-xs text-foreground/80">{recoveryTruth}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authTruth = useAuthStore(selectAuthTruth);
  const location = useLocation();
  const recoveryPath = `${location.pathname}${location.search}${location.hash}`;

  if (authTruth.access === 'pending') {
    return <LoadingScreen authTruth={authTruth} recoveryPath={recoveryPath} />;
  }
  if (authTruth.access !== 'granted') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          redirectTo: recoveryPath,
        }}
      />
    );
  }

  return <>{children}</>;
}

export function createAppRoutes() {
  return [
    { path: '/', element: <Navigate to="/library" replace /> },
    { path: '/login', element: <LoginPage /> },
    {
      path: '/library',
      element: (
        <AuthGuard>
          <LibraryPage />
        </AuthGuard>
      ),
    },
    {
      path: '/project',
      element: (
        <AuthGuard>
          <EditorPage routeMode="project-selection" />
        </AuthGuard>
      ),
    },
    {
      path: '/project/:id',
      element: (
        <AuthGuard>
          <EditorPage routeMode="project-id" />
        </AuthGuard>
      ),
    },
    {
      path: '/settings',
      element: (
        <AuthGuard>
          <SettingsPage />
        </AuthGuard>
      ),
    },
  ];
}

const router = createBrowserRouter(createAppRoutes());

export function App() {
  const { initAuth } = useAuth();

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  return <RouterProvider router={router} />;
}
