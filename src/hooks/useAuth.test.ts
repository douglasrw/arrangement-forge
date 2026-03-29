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

  supabaseMock.auth.getUser.mockResolvedValue({
    data: {
      user: { id: 'user-1' },
    },
  });
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
