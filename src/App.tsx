import { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth-store';
import EditorPage from '@/pages/EditorPage';
import LoginPage from '@/pages/LoginPage';
import LibraryPage from '@/pages/LibraryPage';
import SettingsPage from '@/pages/SettingsPage';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/library" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/library', element: <AuthGuard><LibraryPage /></AuthGuard> },
  { path: '/project/:id', element: <AuthGuard><EditorPage /></AuthGuard> },
  { path: '/settings', element: <AuthGuard><SettingsPage /></AuthGuard> },
]);

export function App() {
  const { initAuth } = useAuth();

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  return <RouterProvider router={router} />;
}
