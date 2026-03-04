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
    <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
      <div className="card bg-base-200 shadow-xl w-full max-w-sm">
        <div className="card-body gap-6">
          {/* Logo */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary tracking-tight">
              Arrangement Forge
            </h1>
            <p className="text-base-content/50 text-sm mt-1">
              AI-powered backing tracks
            </p>
          </div>

          {/* Mode toggle */}
          <div className="tabs tabs-boxed bg-base-300">
            <button
              className={`tab flex-1 ${mode === 'signin' ? 'tab-active' : ''}`}
              onClick={() => { setMode('signin'); setError(null); }}
            >
              Sign In
            </button>
            <button
              className={`tab flex-1 ${mode === 'signup' ? 'tab-active' : ''}`}
              onClick={() => { setMode('signup'); setError(null); }}
            >
              Sign Up
            </button>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="login-email">
                <span className="label-text text-xs text-base-content/70">Email</span>
              </label>
              <input
                id="login-email"
                type="email"
                className="input input-bordered input-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-control gap-1">
              <label className="label py-0" htmlFor="login-password">
                <span className="label-text text-xs text-base-content/70">Password</span>
              </label>
              <input
                id="login-password"
                type="password"
                className="input input-bordered input-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="alert alert-error py-2 text-sm">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={loading}
            >
              {loading
                ? <span className="loading loading-spinner loading-xs" />
                : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="divider text-xs text-base-content/40 my-0">or</div>

          {/* Google OAuth */}
          <button
            className="btn btn-outline btn-sm gap-2"
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
