// @vitest-environment jsdom

import { act, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useAuth } from './useAuth';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

type Row = Record<string, unknown>;

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
let unsubscribeMock: ReturnType<typeof vi.fn>;
let authStateChangeHandler:
  | ((event: string, session: { user?: { id: string; email?: string } } | null) => void)
  | null = null;

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  hookValue = null;
  profileRow = null;
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
  supabaseMock.auth.signInWithPassword.mockResolvedValue({ error: null });
  supabaseMock.auth.signUp.mockResolvedValue({ error: null });
  supabaseMock.auth.signInWithOAuth.mockResolvedValue({ error: null });
  supabaseMock.auth.signOut.mockResolvedValue({ error: null });
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return createProfileQuery(profileRow);
    }

    throw new Error(`Unexpected table ${table}`);
  });

  useAuthStore.setState({
    user: null,
    profile: null,
    isLoading: false,
    isAuthenticated: false,
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
  it('reloads the persisted profile and applies its chord display preference', async () => {
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

    await act(async () => {
      await hookValue!.loadProfile();
      await Promise.resolve();
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
  });
});

describe('useAuth auth action failures', () => {
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

    expect(useAuthStore.getState().isLoading).toBe(true);

    await act(async () => {
      await flushAsyncWork();
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 'user-1', email: 'ash@example.com' },
      isAuthenticated: true,
      isLoading: false,
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
      isAuthenticated: false,
      isLoading: false,
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
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
      isAuthenticated: false,
      isLoading: false,
    });
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
      useAuthStore.getState().setLoading(true);
      useUiStore.getState().setChordDisplayMode('roman');
      authStateChangeHandler?.('SIGNED_OUT', null);
    });

    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
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
      isAuthenticated: true,
      isLoading: false,
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
      isAuthenticated: false,
      isLoading: false,
    });
    expect(useUiStore.getState().chordDisplayMode).toBe('letter');
    expect(redirectHref).toBe('/login');
  });
});
