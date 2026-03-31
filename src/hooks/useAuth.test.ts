// @vitest-environment jsdom

import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useAuth } from './useAuth';
import { getAuthTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

type Row = Record<string, unknown>;
type ProfileQueryResult = {
  data: Row | null;
  error: null;
};

const supabaseMock = vi.hoisted(() => ({
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(),
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

vi.mock('@/lib/supabase', () => ({
  supabase: supabaseMock,
}));

function createProfileQuery(profileRow: Row | null) {
  return {
    select: () => ({
      eq: () => ({
        single: () =>
          profileQueryResult ??
          Promise.resolve({
            data: profileRow,
            error: null,
          }),
      }),
    }),
  };
}

let hookValue: ReturnType<typeof useAuth> | null = null;
let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let profileRow: Row | null = null;
let profileQueryResult: Promise<ProfileQueryResult> | null = null;
let unsubscribeMock: ReturnType<typeof vi.fn>;
let authStateChangeHandler:
  | ((event: string, session: { user?: { id: string; email?: string } } | null) => void)
  | null = null;

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

function UseAuthHarness() {
  hookValue = useAuth();
  return null;
}

function renderHarness() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(createElement(UseAuthHarness));
  });

  return { container, root };
}

function setAuthStoreFixture(
  state: Pick<
    ReturnType<typeof useAuthStore.getState>,
    'user' | 'profile' | 'authStatus' | 'signedOutReason'
  >
) {
  useAuthStore.setState(state);
}

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  hookValue = null;
  profileRow = null;
  profileQueryResult = null;
  unsubscribeMock = vi.fn();
  authStateChangeHandler = null;

  supabaseMock.auth.getUser.mockReset();
  supabaseMock.auth.getSession.mockReset();
  supabaseMock.auth.onAuthStateChange.mockReset();
  supabaseMock.auth.signInWithPassword.mockReset();
  supabaseMock.auth.signUp.mockReset();
  supabaseMock.auth.signInWithOAuth.mockReset();
  supabaseMock.auth.signOut.mockReset();
  supabaseMock.from.mockReset();

  supabaseMock.auth.getUser.mockResolvedValue({
    data: {
      user: { id: 'user-1' },
    },
  });
  supabaseMock.auth.getSession.mockResolvedValue({
    data: {
      session: null,
    },
  });
  supabaseMock.auth.onAuthStateChange.mockImplementation((callback) => {
    authStateChangeHandler = callback;
    return {
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    };
  });
  supabaseMock.auth.signInWithPassword.mockResolvedValue({
    data: {
      session: {
        user: { id: 'user-1', email: 'ash@example.com' },
      },
    },
    error: null,
  });
  supabaseMock.auth.signUp.mockResolvedValue({
    data: {
      session: {
        user: { id: 'user-1', email: 'ash@example.com' },
      },
    },
    error: null,
  });
  supabaseMock.auth.signInWithOAuth.mockResolvedValue({ error: null });
  supabaseMock.auth.signOut.mockResolvedValue({ error: null });
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return createProfileQuery(profileRow);
    }

    throw new Error(`Unexpected table ${table}`);
  });

  setAuthStoreFixture({
    user: null,
    profile: null,
    authStatus: 'signed-out',
    signedOutReason: 'no-session',
  });
  useUiStore.setState({
    chordDisplayMode: 'letter',
    systemStatus: 'ready',
    errorMessage: null,
  });
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

describe('useAuth loadProfile', () => {
  it('loads the persisted profile without opening the auth gate early', async () => {
    profileRow = {
      id: 'user-1',
      display_name: 'Ashlyn',
      chord_display_mode: 'roman',
      default_genre: 'Pop',
      created_at: '2026-03-29T00:00:00Z',
      updated_at: '2026-03-29T01:00:00Z',
    };

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let loadedProfile: Awaited<ReturnType<ReturnType<typeof useAuth>['loadProfile']>> | null = null;

    await act(async () => {
      loadedProfile = await hookValue!.loadProfile();
      await Promise.resolve();
    });

    expect(loadedProfile).toEqual({
      id: 'user-1',
      displayName: 'Ashlyn',
      chordDisplayMode: 'roman',
      defaultGenre: 'Pop',
      createdAt: '2026-03-29T00:00:00Z',
      updatedAt: '2026-03-29T01:00:00Z',
    });
    expect(useAuthStore.getState()).toMatchObject({
      profile: null,
      authStatus: 'signed-out',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });
});

describe('useAuth auth action failures', () => {
  it('returns the explicit auth truth surface instead of legacy auth status booleans', () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(hookValue).toMatchObject({
      user: null,
      profile: null,
      authStoreTruth: {
        user: null,
        profile: null,
        authTruth: {
          status: 'signed-out',
          access: 'blocked',
          currentState: 'No saved session was found.',
          nextStep: 'sign-in',
          nextStepLabel: 'Sign in',
          nextStepDetail: 'Sign in to reopen the app.',
          signedOutReason: 'no-session',
        },
      },
      authTruth: {
        status: 'signed-out',
        access: 'blocked',
        currentState: 'No saved session was found.',
        nextStep: 'sign-in',
        nextStepLabel: 'Sign in',
        nextStepDetail: 'Sign in to reopen the app.',
        signedOutReason: 'no-session',
      },
    });
    expect('authStatus' in hookValue!).toBe(false);
    expect('isLoading' in hookValue!).toBe(false);
    expect('isAuthenticated' in hookValue!).toBe(false);
    expect('signedOutReason' in hookValue!).toBe(false);
    expect('authState' in hookValue!).toBe(false);
    expect('authGate' in hookValue!).toBe(false);
  });

  it('exposes one named auth store truth surface without legacy aliases', () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(hookValue!.authStoreTruth).toEqual({
      user: null,
      profile: null,
      authTruth: {
        status: 'signed-out',
        access: 'blocked',
        currentState: 'No saved session was found.',
        nextStep: 'sign-in',
        nextStepLabel: 'Sign in',
        nextStepDetail: 'Sign in to reopen the app.',
        signedOutReason: 'no-session',
      },
    });
  });

  it('marks the auth gate as checking-session after sign-in succeeds', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      await hookValue!.signIn('ash@example.com', 'secret-1');
    });

    expect(useAuthStore.getState()).toMatchObject({
      authStatus: 'checking-session',
      signedOutReason: null,
    });
    expect(hookValue!.authTruth).toMatchObject({
      status: 'checking-session',
      access: 'pending',
      currentState: 'Checking for an existing session.',
      nextStep: 'wait-for-session',
      nextStepLabel: 'Wait for session bootstrap',
      nextStepDetail: 'Wait for session bootstrap to finish.',
      signedOutReason: null,
    });
  });

  it('preserves sign-in failures from Supabase', async () => {
    const failure = new Error('Invalid email or password');
    supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: failure });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await expect(hookValue!.signIn('ash@example.com', 'secret-1')).rejects.toBe(failure);
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'ash@example.com',
      password: 'secret-1',
    });
  });

  it('preserves sign-up failures from Supabase', async () => {
    const failure = new Error('Email already registered');
    supabaseMock.auth.signUp.mockResolvedValue({ error: failure });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await expect(hookValue!.signUp('ash@example.com', 'secret-1')).rejects.toBe(failure);
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'ash@example.com',
      password: 'secret-1',
    });
  });

  it('keeps the auth gate signed out with an explicit reason when sign-up needs email confirmation', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: {
        session: null,
        user: { id: 'user-1', email: 'ash@example.com' },
      },
      error: null,
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let signUpResult: Awaited<ReturnType<ReturnType<typeof useAuth>['signUp']>> | null = null;

    await act(async () => {
      signUpResult = await hookValue!.signUp('ash@example.com', 'secret-1');
    });

    expect(signUpResult).toEqual({
      status: 'confirmation-required',
    });
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'email-confirmation-required',
    });
    expect(hookValue!.authTruth).toEqual({
      status: 'signed-out',
      access: 'blocked',
      currentState: 'Email confirmation is still required before a session can start.',
      nextStep: 'confirm-email',
      nextStepLabel: 'Confirm your email',
      nextStepDetail: 'Open the confirmation email, then sign in again.',
      signedOutReason: 'email-confirmation-required',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });

  it('derives auth truth from raw auth state without stale aliases', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      useAuthStore.setState({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'missing-profile',
      });
      await Promise.resolve();
    });

    expect(hookValue!.authTruth).toEqual({
      status: 'signed-out',
      access: 'blocked',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
  });

  it('exposes one auth truth surface with both the current state and next step', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      useAuthStore.setState({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'session-lookup-failed',
      });
      await Promise.resolve();
    });

    expect(hookValue!.authTruth).toEqual(
      getAuthTruth({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'session-lookup-failed',
      })
    );
  });

  it('exposes a named auth state slice so consumers do not have to stitch user and gate truth together', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await act(async () => {
      useAuthStore.setState({
        user: { id: 'user-1', email: 'ash@example.com' },
        profile: {
          id: 'user-1',
          displayName: 'Ashlyn',
          chordDisplayMode: 'roman',
          defaultGenre: 'Pop',
          createdAt: '2026-03-29T00:00:00Z',
          updatedAt: '2026-03-29T01:00:00Z',
        },
        authStatus: 'authenticated',
        signedOutReason: null,
      });
      await Promise.resolve();
    });

    expect(hookValue!.authStoreTruth).toEqual({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
      authTruth: {
        status: 'authenticated',
        access: 'granted',
        currentState: 'An authenticated session is ready.',
        nextStep: 'open-app',
        nextStepLabel: 'Open the app',
        nextStepDetail: 'Open the app.',
        signedOutReason: null,
      },
    });
  });

  it('preserves Google auth failures from Supabase', async () => {
    const failure = new Error('Google popup blocked');
    supabaseMock.auth.signInWithOAuth.mockResolvedValue({ error: failure });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    await expect(hookValue!.signInWithGoogle()).rejects.toBe(failure);
    expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
    });
  });
});

describe('useAuth session bootstrap truth', () => {
  it('restores the authenticated session only after the persisted profile is loaded', async () => {
    profileRow = {
      id: 'user-1',
      display_name: 'Ashlyn',
      chord_display_mode: 'roman',
      default_genre: 'Pop',
      created_at: '2026-03-29T00:00:00Z',
      updated_at: '2026-03-29T01:00:00Z',
    };
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ash@example.com' },
        },
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    let cleanup: (() => void) | undefined;

    act(() => {
      cleanup = hookValue!.initAuth();
    });

    expect(useAuthStore.getState().authStatus).toBe('checking-session');

    await act(async () => {
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 'user-1', email: 'ash@example.com' },
      authStatus: 'authenticated',
      signedOutReason: null,
    });
    expect(useAuthStore.getState().profile).toEqual({
      id: 'user-1',
      displayName: 'Ashlyn',
      chordDisplayMode: 'roman',
      defaultGenre: 'Pop',
      createdAt: '2026-03-29T00:00:00Z',
      updatedAt: '2026-03-29T01:00:00Z',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('roman');

    cleanup?.();
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('exits bootstrap loading without authenticating a session that has no profile row', async () => {
    useUiStore.getState().setChordDisplayMode('roman');

    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ash@example.com' },
        },
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'missing-profile',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });

  it('surfaces the blocked next step when session restore stops at a missing profile', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ash@example.com' },
        },
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await flushAsyncWork();
    });

    expect(hookValue!.authTruth).toMatchObject({
      status: 'signed-out',
      access: 'blocked',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
  });

  it('exits bootstrap loading when Supabase session lookup fails', async () => {
    supabaseMock.auth.getSession.mockRejectedValue(new Error('Session lookup failed'));

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'session-lookup-failed',
    });
  });

  it('keeps the no-session bootstrap truth when Supabase emits a trailing sign-out event', async () => {
    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'no-session',
    });

    act(() => {
      authStateChangeHandler?.('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'no-session',
    });
    expect(hookValue!.authTruth).toMatchObject({
      status: 'signed-out',
      access: 'blocked',
      currentState: 'No saved session was found.',
      nextStep: 'sign-in',
      nextStepLabel: 'Sign in',
      nextStepDetail: 'Sign in to reopen the app.',
      signedOutReason: 'no-session',
    });
  });

  it('keeps the auth gate closed until a signed-in profile finishes hydrating', async () => {
    const profileRequest = createDeferred<ProfileQueryResult>();
    profileQueryResult = profileRequest.promise;
    supabaseMock.auth.getSession.mockImplementation(() => new Promise(() => {}));

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      authStateChangeHandler?.('SIGNED_IN', {
        user: { id: 'user-1', email: 'ash@example.com' },
      });
      await Promise.resolve();
    });

    expect(useAuthStore.getState()).toMatchObject({
      authStatus: 'checking-session',
      signedOutReason: null,
    });

    await act(async () => {
      profileRequest.resolve?.({
        data: {
          id: 'user-1',
          display_name: 'Ashlyn',
          chord_display_mode: 'roman',
          default_genre: 'Pop',
          created_at: '2026-03-29T00:00:00Z',
          updated_at: '2026-03-29T01:00:00Z',
        },
        error: null,
      });
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 'user-1', email: 'ash@example.com' },
      authStatus: 'authenticated',
      signedOutReason: null,
    });
  });

  it('keeps a stale profile hydrate from reopening the auth gate after sign-out', async () => {
    const profileRequest = createDeferred<ProfileQueryResult>();
    profileQueryResult = profileRequest.promise;
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ash@example.com' },
        },
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(useAuthStore.getState()).toMatchObject({
      authStatus: 'checking-session',
      signedOutReason: null,
    });

    act(() => {
      authStateChangeHandler?.('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'signed-out',
    });

    await act(async () => {
      profileRequest.resolve?.({
        data: {
          id: 'user-1',
          display_name: 'Ashlyn',
          chord_display_mode: 'roman',
          default_genre: 'Pop',
          created_at: '2026-03-29T00:00:00Z',
          updated_at: '2026-03-29T01:00:00Z',
        },
        error: null,
      });
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'signed-out',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });

  it('clears auth state and loading when Supabase emits a sign-out event', async () => {
    profileRow = {
      id: 'user-1',
      display_name: 'Ashlyn',
      chord_display_mode: 'roman',
      default_genre: 'Pop',
      created_at: '2026-03-29T00:00:00Z',
      updated_at: '2026-03-29T01:00:00Z',
    };
    supabaseMock.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'ash@example.com' },
        },
      },
    });

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    act(() => {
      hookValue!.initAuth();
    });

    await act(async () => {
      await flushAsyncWork();
    });

    act(() => {
      useAuthStore.getState().beginSessionCheck();
      useUiStore.getState().setChordDisplayMode('roman');
      authStateChangeHandler?.('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'signed-out',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
  });
});

describe('useAuth signOut', () => {
  it('clears auth state before redirecting to login', async () => {
    const originalLocation = window.location;
    const fakeLocation = { href: '/library' };
    let redirectHref = originalLocation.href;

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: fakeLocation,
    });

    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
      authStatus: 'authenticated',
      signedOutReason: null,
    });
    useUiStore.getState().setChordDisplayMode('roman');

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    try {
      await act(async () => {
        await hookValue!.signOut();
      });
      redirectHref = fakeLocation.href;
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }

    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'signed-out',
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
    expect(redirectHref).toBe('/login');
  });

  it('preserves the authenticated truth surface when Supabase sign-out fails', async () => {
    const failure = new Error('Sign-out failed');
    supabaseMock.auth.signOut.mockResolvedValue({ error: failure });

    const originalLocation = window.location;
    const fakeLocation = { href: '/library' };

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: fakeLocation,
    });

    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
      authStatus: 'authenticated',
      signedOutReason: null,
    });
    useUiStore.getState().setChordDisplayMode('roman');

    const mounted = renderHarness();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    try {
      await expect(hookValue!.signOut()).rejects.toBe(failure);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      });
    }

    expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 'user-1', email: 'ash@example.com' },
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
      authStatus: 'authenticated',
      signedOutReason: null,
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('roman');
    expect(fakeLocation.href).toBe('/library');
  });
});
