import { useState, useEffect, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { AuthTruth } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function resolveRecoveryPath(state: unknown) {
  if (state && typeof state === 'object' && 'redirectTo' in state) {
    const redirectTo = (state as { redirectTo?: unknown }).redirectTo;

    if (
      typeof redirectTo === 'string' &&
      redirectTo.startsWith('/') &&
      !redirectTo.startsWith('//') &&
      redirectTo !== '/login' &&
      !redirectTo.startsWith('/login?') &&
      !redirectTo.startsWith('/login#')
    ) {
      return redirectTo;
    }
  }

  return '/library';
}

function describeRecoveryDestination(path: string) {
  if (path === '/project') {
    return 'project selection in the editor';
  }

  if (path.startsWith('/project/')) {
    return 'your project';
  }

  if (path.startsWith('/settings')) {
    return 'settings';
  }

  if (path.startsWith('/library')) {
    return 'the library';
  }

  return 'your workspace';
}

function AuthLoadingScreen({
  authTruth,
  recoveryPath,
}: {
  authTruth: AuthTruth;
  recoveryPath: string;
}) {
  const recoveryDestination = describeRecoveryDestination(recoveryPath);

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
              {authTruth.nextStep === 'open-app'
                ? `${authTruth.currentState} Returning you to ${recoveryDestination}.`
                : `${authTruth.currentState} Next step: ${authTruth.nextStepLabel}. ${authTruth.nextStepDetail} If one is found, you will continue to ${recoveryDestination}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function getFailureTitle(path: 'signin' | 'signup' | 'google') {
  switch (path) {
    case 'signup':
      return 'Account creation failed';
    case 'google':
      return 'Google sign-in failed';
    default:
      return 'Email sign-in failed';
  }
}

function AuthStatusNotice({
  activeSubmissionPath,
  authTruth,
  error,
  recoveryPath,
}: {
  activeSubmissionPath: 'signin' | 'signup' | 'google' | null;
  authTruth: AuthTruth;
  error: { path: 'signin' | 'signup' | 'google'; message: string } | null;
  recoveryPath: string;
}) {
  const recoveryDestination = describeRecoveryDestination(recoveryPath);

  if (error) {
    return (
      <Alert data-testid="auth-status-notice" variant="destructive">
        <AlertTitle>Authentication failed</AlertTitle>
        <AlertDescription>
          <p>
            {getFailureTitle(error.path)}: {error.message}
          </p>
          <p>
            Check your details or try another sign-in path. After a successful retry, Arrangement
            Forge will return you to {recoveryDestination}.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  if (activeSubmissionPath) {
    const waitingDescription =
      activeSubmissionPath === 'google'
        ? `Finish the Google handoff in the popup or redirected window. When Google hands control back, Arrangement Forge will continue to ${recoveryDestination}.`
        : activeSubmissionPath === 'signup'
          ? `Arrangement Forge is creating your account. Keep this tab open and you will continue to ${recoveryDestination} as soon as authentication succeeds.`
          : `Arrangement Forge is checking your credentials. Keep this tab open and you will continue to ${recoveryDestination} as soon as authentication succeeds.`;

    return (
      <Alert data-testid="auth-status-notice">
        <AlertTitle>Waiting on authentication</AlertTitle>
        <AlertDescription>{waitingDescription}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert data-testid="auth-status-notice">
      <AlertTitle>Authentication blocked</AlertTitle>
      <AlertDescription>
        <p>{authTruth.currentState}</p>
        <p>
          Next step: {authTruth.nextStepLabel}. {authTruth.nextStepDetail} After authentication,
          Arrangement Forge will return you to {recoveryDestination}.
        </p>
      </AlertDescription>
    </Alert>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authTruth, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeSubmissionPath, setActiveSubmissionPath] = useState<
    'signin' | 'signup' | 'google' | null
  >(null);
  const [error, setError] = useState<{
    path: 'signin' | 'signup' | 'google';
    message: string;
  } | null>(null);
  const recoveryPath = resolveRecoveryPath(location.state);
  const isSubmitting = activeSubmissionPath !== null;
  const isCheckingSession = authTruth.access === 'pending';
  const hasAuthenticatedSession = authTruth.access === 'granted';

  useEffect(() => {
    if (hasAuthenticatedSession) {
      navigate(recoveryPath, { replace: true });
    }
  }, [hasAuthenticatedSession, navigate, recoveryPath]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const submissionPath = mode;
    setError(null);
    setActiveSubmissionPath(submissionPath);
    try {
      if (submissionPath === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError({
        path: submissionPath,
        message: err instanceof Error ? err.message : 'Authentication failed',
      });
    } finally {
      setActiveSubmissionPath(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setActiveSubmissionPath('google');
    try {
      await signInWithGoogle();
      // OAuth redirects externally; no navigate() needed
    } catch (err) {
      setError({
        path: 'google',
        message: err instanceof Error ? err.message : 'Authentication failed',
      });
      setActiveSubmissionPath(null);
    }
  }

  if (isCheckingSession || hasAuthenticatedSession) {
    return <AuthLoadingScreen authTruth={authTruth} recoveryPath={recoveryPath} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card shadow-xl w-full max-w-sm border border-border rounded-lg p-6">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Arrangement Forge</h1>
            <p className="text-muted-foreground text-sm mt-1">AI-powered backing tracks</p>
          </div>

          <AuthStatusNotice
            activeSubmissionPath={activeSubmissionPath}
            authTruth={authTruth}
            error={error}
            recoveryPath={recoveryPath}
          />

          {/* Mode toggle */}
          <div className="flex gap-2 bg-secondary rounded-lg p-1">
            <Button
              variant={mode === 'signin' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
            >
              Sign In
            </Button>
            <Button
              variant={mode === 'signup' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1"
              disabled={isSubmitting}
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
            >
              Sign Up
            </Button>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email" className="text-xs text-muted-foreground">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-password" className="text-xs text-muted-foreground">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {activeSubmissionPath === 'signin'
                ? 'Signing in...'
                : activeSubmissionPath === 'signup'
                  ? 'Creating account...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
            </Button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            or
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {activeSubmissionPath === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
          </Button>
        </div>
      </div>
    </div>
  );
}
