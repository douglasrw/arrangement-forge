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
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
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

export default function App() {
  const { initAuth } = useAuth();

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  return <RouterProvider router={router} />;
}
