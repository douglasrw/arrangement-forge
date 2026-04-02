// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import LoginPage from './LoginPage';
import type { SignUpResult } from '@/hooks/useAuth';

const authApi = vi.hoisted(() => ({
  authStatus: 'signed-out',
  signedOutReason: 'no-session',
  get authReadiness() {
    return this.authTruth.readiness;
  },
  get authTruth() {
    if (this.authStatus === 'checking-session') {
      return {
        status: 'checking-session',
        readiness: 'waiting',
        access: 'pending',
        blockingState: 'none',
        currentState: 'Checking for an existing session.',
        nextStep: 'wait-for-session',
        nextStepLabel: 'Wait for session bootstrap',
        nextStepDetail: 'Wait for session bootstrap to finish.',
        signedOutReason: null,
      };
    }

    if (this.authStatus === 'authenticated') {
      return {
        status: 'authenticated',
        readiness: 'ready',
        access: 'granted',
        blockingState: 'none',
        currentState: 'An authenticated session is ready.',
        nextStep: 'open-app',
        nextStepLabel: 'Open the app',
        nextStepDetail: 'Open the app.',
        signedOutReason: null,
      };
    }

    return {
      status: 'signed-out',
      readiness: 'blocked',
      access: 'blocked',
      blockingState:
        this.signedOutReason === 'missing-profile'
        || this.signedOutReason === 'profile-load-failed'
        || this.signedOutReason === 'session-lookup-failed'
          ? 'error'
          : 'signed-out',
      currentState:
        this.signedOutReason === 'email-confirmation-required'
          ? 'Email confirmation is still required before a session can start.'
          : this.signedOutReason === 'missing-profile'
            ? 'The saved profile is missing, so the session cannot reopen yet.'
            : this.signedOutReason === 'profile-load-failed'
              ? 'The saved profile could not be loaded.'
              : this.signedOutReason === 'session-lookup-failed'
                ? 'The previous session could not be restored.'
                : this.signedOutReason === 'signed-out'
                  ? 'The previous session has been signed out.'
                  : 'No saved session was found.',
      nextStep:
        this.signedOutReason === 'email-confirmation-required'
          ? 'confirm-email'
          : this.signedOutReason === 'missing-profile'
            ? 'complete-profile'
            : this.signedOutReason === 'profile-load-failed'
              ? 'retry-profile-load'
              : this.signedOutReason === 'session-lookup-failed'
                ? 'retry-session'
                : 'sign-in',
      nextStepLabel:
        this.signedOutReason === 'email-confirmation-required'
          ? 'Confirm your email'
          : this.signedOutReason === 'missing-profile'
            ? 'Complete the profile'
            : this.signedOutReason === 'profile-load-failed'
              ? 'Retry the profile load'
              : this.signedOutReason === 'session-lookup-failed'
                ? 'Retry session restore'
                : this.signedOutReason === 'signed-out'
                  ? 'Sign in again'
                  : 'Sign in',
      nextStepDetail:
        this.signedOutReason === 'email-confirmation-required'
          ? 'Open the confirmation email, then sign in again.'
          : this.signedOutReason === 'missing-profile'
            ? 'Restore or complete the profile, then sign in again.'
            : this.signedOutReason === 'profile-load-failed'
              ? 'Retry the profile load by signing in again.'
              : this.signedOutReason === 'session-lookup-failed'
                ? 'Retry session restoration by signing in again.'
                : this.signedOutReason === 'signed-out'
                  ? 'Sign in again to continue.'
                  : 'Sign in to reopen the app.',
      signedOutReason: this.signedOutReason,
    };
  },
  get authGate() {
    const { status: _status, ...authGate } = this.authTruth;
    return authGate;
  },
  signIn: vi.fn<(email: string, password: string) => Promise<void>>(),
  signUp: vi.fn<(email: string, password: string) => Promise<SignUpResult>>(),
  signInWithGoogle: vi.fn<() => Promise<void>>(),
}));

const navigateMock = vi.hoisted(() => vi.fn());
const locationMock = vi.hoisted(() => ({
  pathname: '/login',
  search: '',
  hash: '',
  state: null as unknown,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authApi,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useLocation: () => locationMock,
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function renderLoginPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(<LoginPage />);
  });

  return { container, root };
}

function rerenderLoginPage(root: Root) {
  act(() => {
    root.render(<LoginPage />);
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function clickButton(button: HTMLButtonElement | null) {
  button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function createDeferred<T>() {
  let resolve: ((value: T | PromiseLike<T>) => void) | undefined;
  let reject: ((reason?: unknown) => void) | undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function fillCredentials(container: HTMLElement, email: string, password: string) {
  const emailInput = container.querySelector('#login-email') as HTMLInputElement | null;
  const passwordInput = container.querySelector('#login-password') as HTMLInputElement | null;

  if (!emailInput || !passwordInput) {
    throw new Error('Login form inputs not found');
  }

  act(() => {
    setInputValue(emailInput, email);
    setInputValue(passwordInput, password);
  });
}

function submitLoginForm(container: HTMLElement) {
  const form = container.querySelector('form');

  if (!form) {
    throw new Error('Login form not found');
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll('button')).find(
      (button): button is HTMLButtonElement => button.textContent?.trim() === text
    ) ?? null
  );
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;

  authApi.signIn.mockReset();
  authApi.signUp.mockReset();
  authApi.signInWithGoogle.mockReset();
  authApi.authStatus = 'signed-out';
  authApi.signedOutReason = 'no-session';
  navigateMock.mockReset();
  locationMock.pathname = '/login';
  locationMock.search = '';
  locationMock.hash = '';
  locationMock.state = null;

  authApi.signIn.mockResolvedValue(undefined);
  authApi.signUp.mockResolvedValue({
    status: 'session-pending',
  });
  authApi.signInWithGoogle.mockResolvedValue(undefined);
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

describe('LoginPage failure truth', () => {
  it('returns successful sign-ins to the originally requested protected route after auth truth is granted', async () => {
    locationMock.state = {
      redirectTo: '/project/project-1?tab=arrangement#bridge',
    };
    authApi.signIn.mockImplementation(async () => {
      authApi.authStatus = 'checking-session';
    });

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signIn).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Checking for an existing session.');

    authApi.authStatus = 'authenticated';
    rerenderLoginPage(mounted.root);

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/project/project-1?tab=arrangement#bridge', {
      replace: true,
    });
  });

  it('falls back to the library when no safe recovery route is present after auth truth is granted', async () => {
    locationMock.state = {
      redirectTo: '//evil.example/session',
    };
    authApi.signIn.mockImplementation(async () => {
      authApi.authStatus = 'checking-session';
    });

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(navigateMock).not.toHaveBeenCalled();

    authApi.authStatus = 'authenticated';
    rerenderLoginPage(mounted.root);

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/library', { replace: true });
  });

  it('keeps the blocked state and exact editor recovery target visible before authentication begins', () => {
    locationMock.state = {
      redirectTo: '/project/project-1?tab=arrangement',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Authentication blocked');
    expect(mounted.container.textContent).toContain('return you to project project-1 in the editor');
    expect(mounted.container.querySelector('form')).not.toBeNull();
  });

  it('names the editor fallback route before authentication begins', () => {
    locationMock.state = {
      redirectTo: '/project',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Authentication blocked');
    expect(mounted.container.textContent).toContain('return you to project selection in the editor');
    expect(mounted.container.querySelector('form')).not.toBeNull();
  });

  it('shows why the login form is blocked when the prior session lost its saved profile', () => {
    authApi.signedOutReason = 'missing-profile';
    locationMock.state = {
      redirectTo: '/settings',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Authentication failed');
    expect(mounted.container.textContent).toContain(
      'The saved profile is missing, so the session cannot reopen yet.'
    );
    expect(mounted.container.textContent).toContain(
      'Restore or complete the profile, then sign in again.'
    );
    expect(mounted.container.textContent).toContain('Next step: Complete the profile.');
    expect(mounted.container.textContent).toContain('return you to settings');
  });

  it('surfaces sign-in failures without navigating away', async () => {
    locationMock.state = {
      redirectTo: '/settings',
    };
    authApi.signIn.mockRejectedValueOnce(new Error('Invalid email or password'));

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signIn).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(mounted.container.textContent).toContain('Authentication failed');
    expect(mounted.container.textContent).toContain('Email sign-in failed');
    expect(mounted.container.textContent).toContain('Invalid email or password');
    expect(mounted.container.textContent).toContain('return you to settings');
    expect(navigateMock).not.toHaveBeenCalled();

    const submitButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    expect(submitButton?.disabled).toBe(false);
  });

  it('shows explicit sign-in submission truth while email auth is in progress', async () => {
    const signInRequest = createDeferred<void>();
    authApi.signIn.mockImplementation(() => signInRequest.promise);

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signIn).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(mounted.container.textContent).toContain('Waiting on authentication');
    expect(mounted.container.textContent).toContain('continue to the library');
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.textContent
    ).toBe('Signing in...');
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.disabled
    ).toBe(true);
    expect(findButtonByText(mounted.container, 'Continue with Google')?.disabled).toBe(true);

    await act(async () => {
      signInRequest.resolve?.(undefined);
      await Promise.resolve();
    });
  });

  it('surfaces sign-up failures and clears the stale error when the mode changes', async () => {
    authApi.signUp.mockRejectedValueOnce(new Error('Email already registered'));

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      clickButton(findButtonByText(mounted.container, 'Sign Up'));
    });

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signUp).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(mounted.container.textContent).toContain('Account creation failed');
    expect(mounted.container.textContent).toContain('Email already registered');

    act(() => {
      clickButton(findButtonByText(mounted.container, 'Sign In'));
    });

    expect(mounted.container.textContent).not.toContain('Email already registered');
  });

  it('shows explicit sign-up submission truth while account creation is in progress', async () => {
    const signUpRequest = createDeferred<void>();
    authApi.signUp.mockImplementation(() => signUpRequest.promise);

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      clickButton(findButtonByText(mounted.container, 'Sign Up'));
    });

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signUp).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.textContent
    ).toBe('Creating account...');
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.disabled
    ).toBe(true);
    expect(findButtonByText(mounted.container, 'Continue with Google')?.disabled).toBe(true);

    await act(async () => {
      signUpRequest.resolve?.(undefined);
      await Promise.resolve();
    });
  });

  it('keeps sign-up on the login surface when email confirmation is still required', async () => {
    locationMock.state = {
      redirectTo: '/settings',
    };
    authApi.signUp.mockImplementation(async () => {
      authApi.signedOutReason = 'email-confirmation-required';
      return {
        status: 'confirmation-required',
      };
    });

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      clickButton(findButtonByText(mounted.container, 'Sign Up'));
    });

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signUp).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(navigateMock).not.toHaveBeenCalled();
    expect(mounted.container.textContent).toContain('Authentication blocked');
    expect(mounted.container.textContent).toContain(
      'Email confirmation is still required before a session can start.'
    );
    expect(mounted.container.textContent).toContain(
      'Open the confirmation email, then sign in again.'
    );
    expect(mounted.container.textContent).toContain('Next step: Confirm your email.');
    expect(mounted.container.textContent).toContain('return you to settings');
    expect(mounted.container.querySelector('form')).not.toBeNull();
  });

  it('clears loading state honestly when Google auth fails', async () => {
    const googleRequest = createDeferred<void>();
    authApi.signInWithGoogle.mockImplementation(() => googleRequest.promise);

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const googleButton = findButtonByText(mounted.container, 'Continue with Google');
    expect(googleButton).not.toBeNull();

    act(() => {
      clickButton(googleButton);
    });

    expect(authApi.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(
      (findButtonByText(mounted.container, 'Connecting to Google...') as HTMLButtonElement | null)
        ?.disabled
    ).toBe(true);
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.disabled
    ).toBe(true);

    await act(async () => {
      googleRequest.reject?.(new Error('Authentication failed'));
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain('Google sign-in failed');
    expect(mounted.container.textContent).toContain('Authentication failed');
    expect(mounted.container.textContent).not.toContain('Email sign-in failed');
    expect(findButtonByText(mounted.container, 'Continue with Google')?.disabled).toBe(false);
    expect(
      (mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)
        ?.disabled
    ).toBe(false);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('keeps the waiting state explicit while session bootstrap is still running', () => {
    authApi.authStatus = 'checking-session';
    locationMock.state = {
      redirectTo: '/settings',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Waiting on authentication');
    expect(mounted.container.textContent).toContain('Checking for an existing session.');
    expect(mounted.container.textContent).toContain('Next step: Wait for session bootstrap.');
    expect(mounted.container.textContent).toContain('continue to settings');
    expect(mounted.container.querySelector('form')).toBeNull();
  });

  it('keeps editor fallback recovery explicit while session bootstrap is still running', () => {
    authApi.authStatus = 'checking-session';
    locationMock.state = {
      redirectTo: '/project',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('continue to project selection in the editor');
    expect(mounted.container.querySelector('form')).toBeNull();
  });

  it('holds authenticated sessions off the login form and recovers them forward', async () => {
    authApi.authStatus = 'authenticated';
    locationMock.state = {
      redirectTo: '/settings',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Authentication ready');
    expect(mounted.container.textContent).not.toContain('Waiting on authentication');
    expect(mounted.container.textContent).toContain('An authenticated session is ready.');
    expect(mounted.container.textContent).toContain('Returning you to settings');
    expect(mounted.container.querySelector('form')).toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/settings', { replace: true });
  });

  it('holds authenticated sessions off the login form and returns them to the editor fallback route', async () => {
    authApi.authStatus = 'authenticated';
    locationMock.state = {
      redirectTo: '/project',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.querySelector('[data-testid="auth-loading-screen"]')).not.toBeNull();
    expect(mounted.container.textContent).toContain('Authentication ready');
    expect(mounted.container.textContent).toContain('Returning you to project selection in the editor');
    expect(mounted.container.querySelector('form')).toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/project', { replace: true });
  });
});
