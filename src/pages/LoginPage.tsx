import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      navigate('/library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth redirects externally; no navigate() needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card shadow-xl w-full max-w-sm border border-border rounded-lg p-6">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Arrangement Forge
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered backing tracks
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2 bg-secondary rounded-lg p-1">
            <button
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setMode('signin'); setError(null); }}
            >
              Sign In
            </button>
            <button
              className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              Sign Up
            </button>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading
                ? '...'
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border" />
            or
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google OAuth */}
          <button
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
