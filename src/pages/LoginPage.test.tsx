// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import LoginPage from './LoginPage';
import type { SignUpResult } from '@/hooks/useAuth';

const authApi = vi.hoisted(() => ({
  authStatus: 'signed-out',
  signedOutReason: 'no-session',
  get authGate() {
    if (this.authStatus === 'checking-session') {
      return {
        access: 'pending',
        nextStep: 'wait-for-session',
        signedOutReason: null,
      };
    }

    if (this.authStatus === 'authenticated') {
      return {
        access: 'granted',
        nextStep: 'open-app',
        signedOutReason: null,
      };
    }

    return {
      access: 'blocked',
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
      signedOutReason: this.signedOutReason,
    };
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
  it('returns successful sign-ins to the originally requested protected route', async () => {
    locationMock.state = {
      redirectTo: '/project/project-1?tab=arrangement#bridge',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(authApi.signIn).toHaveBeenCalledWith('ash@example.com', 'secret-1');
    expect(navigateMock).toHaveBeenCalledWith('/project/project-1?tab=arrangement#bridge', {
      replace: true,
    });
  });

  it('falls back to the library when no safe recovery route is present', async () => {
    locationMock.state = {
      redirectTo: '//evil.example/session',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    fillCredentials(mounted.container, 'ash@example.com', 'secret-1');

    await act(async () => {
      submitLoginForm(mounted.container);
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/library', { replace: true });
  });

  it('keeps the blocked state and recovery target visible before authentication begins', () => {
    locationMock.state = {
      redirectTo: '/project/project-1?tab=arrangement',
    };

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Authentication blocked');
    expect(mounted.container.textContent).toContain('return you to your project');
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

    expect(mounted.container.textContent).toContain('Profile setup is incomplete');
    expect(mounted.container.textContent).toContain('no saved profile was found');
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
    expect(mounted.container.textContent).toContain('Check your email to finish signing up');
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
    expect(mounted.container.textContent).toContain('continue to settings');
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
    expect(mounted.container.textContent).toContain('Waiting on authentication');
    expect(mounted.container.textContent).toContain('Returning you to settings');
    expect(mounted.container.querySelector('form')).toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    expect(navigateMock).toHaveBeenCalledWith('/settings', { replace: true });
  });
});
