import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getProtectedRouteTruth } from '@/lib/editor-route-truth';
import type { AuthTruth } from '@/store/auth-store';
import { selectAuthTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import EditorPage from '@/pages/EditorPage';
import LoginPage from '@/pages/LoginPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';

function LoadingScreen({
  authTruth,
  recoveryPath,
}: {
  authTruth: AuthTruth;
  recoveryPath: string;
}) {
  const protectedRouteTruth = getProtectedRouteTruth(recoveryPath);

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
              If a session is restored, Arrangement Forge will continue to{' '}
              {protectedRouteTruth.recoveryDestination}.
            </p>
            <p className="text-xs text-foreground/80">Current state: {authTruth.currentState}</p>
            <p className="text-xs text-foreground/80">
              Next step: {authTruth.nextStepLabel}. {authTruth.nextStepDetail}
            </p>
            <p className="text-xs text-foreground/80">
              Route mode: {protectedRouteTruth.routeModeLabel}
            </p>
            <p className="text-xs text-foreground/80">
              Route readiness: {protectedRouteTruth.routeReadiness}
            </p>
            <p className="text-xs text-foreground/80">
              Route target: {protectedRouteTruth.routeLabel}
            </p>
            <p className="text-xs text-foreground/80">
              Current route: {protectedRouteTruth.currentRoute}
            </p>
            {protectedRouteTruth.fallbackRoute ? (
              <p className="text-xs text-foreground/80">
                Editor fallback route: {protectedRouteTruth.fallbackRoute}
              </p>
            ) : null}
            <p className="text-xs text-foreground/80">{protectedRouteTruth.routeTruth}</p>
            {protectedRouteTruth.fallbackHandling ? (
              <p className="text-xs text-foreground/80">{protectedRouteTruth.fallbackHandling}</p>
            ) : null}
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
