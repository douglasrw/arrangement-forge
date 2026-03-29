// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import LoginPage from './LoginPage';

const authApi = vi.hoisted(() => ({
  signIn: vi.fn<(email: string, password: string) => Promise<void>>(),
  signUp: vi.fn<(email: string, password: string) => Promise<void>>(),
  signInWithGoogle: vi.fn<() => Promise<void>>(),
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => authApi,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
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
  return Array.from(container.querySelectorAll('button')).find(
    (button): button is HTMLButtonElement => button.textContent?.trim() === text
  ) ?? null;
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;

  authApi.signIn.mockReset();
  authApi.signUp.mockReset();
  authApi.signInWithGoogle.mockReset();
  navigateMock.mockReset();

  authApi.signIn.mockResolvedValue(undefined);
  authApi.signUp.mockResolvedValue(undefined);
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
  it('surfaces sign-in failures without navigating away', async () => {
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
    expect(mounted.container.textContent).toContain('Invalid email or password');
    expect(navigateMock).not.toHaveBeenCalled();

    const submitButton = mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    expect(submitButton?.disabled).toBe(false);
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
    expect(mounted.container.textContent).toContain('Email already registered');

    act(() => {
      clickButton(findButtonByText(mounted.container, 'Sign In'));
    });

    expect(mounted.container.textContent).not.toContain('Email already registered');
  });

  it('clears loading state honestly when Google auth fails', async () => {
    let rejectGoogle: ((error: Error) => void) | undefined;
    authApi.signInWithGoogle.mockImplementation(
      () =>
        new Promise<void>((_, reject) => {
          rejectGoogle = reject;
        })
    );

    const mounted = renderLoginPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const googleButton = findButtonByText(mounted.container, 'Continue with Google');
    expect(googleButton).not.toBeNull();

    act(() => {
      clickButton(googleButton);
    });

    expect(authApi.signInWithGoogle).toHaveBeenCalledTimes(1);
    expect(findButtonByText(mounted.container, 'Continue with Google')?.disabled).toBe(true);
    expect((mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)?.disabled).toBe(true);

    await act(async () => {
      rejectGoogle?.(new Error('Google popup blocked'));
      await Promise.resolve();
    });

    expect(mounted.container.textContent).toContain('Google popup blocked');
    expect(findButtonByText(mounted.container, 'Continue with Google')?.disabled).toBe(false);
    expect((mounted.container.querySelector('button[type="submit"]') as HTMLButtonElement | null)?.disabled).toBe(false);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
