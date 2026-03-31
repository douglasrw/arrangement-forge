import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { selectAuthGateTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import EditorPage from '@/pages/EditorPage';
import LoginPage from '@/pages/LoginPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';

function LoadingScreen() {
  return (
    <div
      data-testid="auth-loading-screen"
      className="min-h-screen bg-background flex items-center justify-center"
    >
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const authGate = useAuthStore(selectAuthGateTruth);
  const location = useLocation();

  if (authGate.access === 'pending') return <LoadingScreen />;
  if (authGate.access !== 'granted') {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          redirectTo: `${location.pathname}${location.search}${location.hash}`,
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
      path: '/project/:id',
      element: (
        <AuthGuard>
          <EditorPage />
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
