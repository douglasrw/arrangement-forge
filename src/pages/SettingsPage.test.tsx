// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAuthGateTruth } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import type { Profile } from '@/types';
import SettingsPage, {
  applySavedProfile,
  createSettingsDraft,
  reconcileSettingsDraft,
  type SettingsDraft,
} from './SettingsPage';

type SaveResponse = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

const reactActEnv = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'profile-1',
    displayName: 'Doug',
    chordDisplayMode: 'letter',
    defaultGenre: 'Jazz',
    createdAt: '2026-03-27T00:00:00Z',
    updatedAt: '2026-03-27T00:00:00Z',
    ...overrides,
  };
}

function renderSettingsPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );
  });

  return { container, root };
}

function createProfileSaveQuery(response: SaveResponse) {
  return {
    upsert: () => ({
      select: () => ({
        single: () => Promise.resolve(response),
      }),
    }),
  };
}

function setAuthStoreFixture(state: Partial<ReturnType<typeof useAuthStore.getState>>) {
  const currentState = useAuthStore.getState();
  const nextState = {
    ...currentState,
    ...state,
  };

  useAuthStore.setState({
    ...state,
    authGate: getAuthGateTruth(nextState),
  });
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

function setInputValue(input: HTMLInputElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;
let saveResponse: SaveResponse;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  saveResponse = {
    data: {
      id: 'user-1',
      display_name: 'Doug',
      chord_display_mode: 'letter',
      default_genre: 'Jazz',
      created_at: '2026-03-27T00:00:00Z',
      updated_at: '2026-03-27T00:00:00Z',
    },
    error: null,
  };
  supabaseMock.from.mockReset();
  supabaseMock.from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return createProfileSaveQuery(saveResponse);
    }

    throw new Error(`Unexpected table ${table}`);
  });
  setAuthStoreFixture({
    user: { id: 'user-1', email: 'ash@example.com' } as User,
    profile: makeProfile(),
    authStatus: 'authenticated',
    signedOutReason: null,
    isLoading: false,
    isAuthenticated: true,
  });
  useUiStore.setState({
    generationState: 'idle',
    systemStatus: 'ready',
    errorMessage: null,
    mixerExpanded: false,
    leftPanelCollapsed: false,
    zoomIndex: 0,
    unsavedChanges: false,
    lastSavedAt: null,
    libraryCount: 0,
    chordDisplayMode: 'letter',
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

describe('SettingsPage draft reconciliation', () => {
  it('creates the initial draft from profile props', () => {
    const draft = createSettingsDraft(makeProfile());

    expect(draft).toEqual({
      profileId: 'profile-1',
      displayName: 'Doug',
      chordMode: 'letter',
      defaultGenre: 'Jazz',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });

  it('refreshes untouched fields while preserving local draft wins on the same profile', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Local Draft Name',
      touchedFields: {
        ...initialDraft.touchedFields,
        displayName: true,
      },
    };

    const reconciled = reconcileSettingsDraft(
      locallyEditedDraft,
      makeProfile({
        displayName: 'Remote Rename',
        chordDisplayMode: 'roman',
        defaultGenre: 'Funk',
        updatedAt: '2026-03-27T01:00:00Z',
      })
    );

    expect(reconciled.displayName).toBe('Local Draft Name');
    expect(reconciled.chordMode).toBe('roman');
    expect(reconciled.defaultGenre).toBe('Funk');
    expect(reconciled.touchedFields).toEqual({
      displayName: true,
      chordMode: false,
      defaultGenre: false,
    });
  });

  it('resets the draft when a different profile arrives', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Keep me only for the old profile',
      chordMode: 'roman',
      defaultGenre: '',
      touchedFields: {
        displayName: true,
        chordMode: true,
        defaultGenre: true,
      },
    };

    const reconciled = reconcileSettingsDraft(
      locallyEditedDraft,
      makeProfile({
        id: 'profile-2',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
      })
    );

    expect(reconciled).toEqual({
      profileId: 'profile-2',
      displayName: 'Ashlyn',
      chordMode: 'roman',
      defaultGenre: 'Pop',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });

  it('refreshes the draft from the saved profile while clearing touched fields', () => {
    const initialDraft = createSettingsDraft(makeProfile());
    const locallyEditedDraft: SettingsDraft = {
      ...initialDraft,
      displayName: 'Saved Name',
      chordMode: 'roman',
      defaultGenre: 'Funk',
      touchedFields: {
        displayName: true,
        chordMode: true,
        defaultGenre: true,
      },
    };

    const updated = applySavedProfile(
      locallyEditedDraft,
      makeProfile({
        displayName: 'Saved Name',
        chordDisplayMode: 'roman',
        defaultGenre: 'Funk',
        updatedAt: '2026-03-28T01:00:00Z',
      })
    );

    expect(updated).toEqual({
      profileId: 'profile-1',
      displayName: 'Saved Name',
      chordMode: 'roman',
      defaultGenre: 'Funk',
      touchedFields: {
        displayName: false,
        chordMode: false,
        defaultGenre: false,
      },
    });
  });
});

describe('SettingsPage truth surface', () => {
  it('renders unsupported settings as truthful status instead of fake disabled controls', () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain('Unavailable in this build');
    expect(mounted.container.textContent).toContain(
      'These settings are fixed today, so this page shows the current behavior instead of fake controls.'
    );
    expect(mounted.container.textContent).toContain(
      'Playback follows your browser or system default output device.'
    );
    expect(mounted.container.textContent).toContain(
      'Projects auto-save after 30 seconds of unsaved changes.'
    );
    expect(mounted.container.textContent).toContain('Arrangement Forge uses one built-in theme.');
    expect(mounted.container.querySelector('#settings-audio-output')).toBeNull();
    expect(mounted.container.querySelector('#settings-autosave')).toBeNull();
    expect(mounted.container.querySelector('#settings-theme')).toBeNull();
  });

  it('keeps saved profile settings editable while unsupported settings stay read-only truth', () => {
    setAuthStoreFixture({
      profile: makeProfile({
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Funk',
      }),
    });

    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const letterRadio = mounted.container.querySelector(
      '#settings-chord-letter'
    ) as HTMLInputElement | null;
    const romanRadio = mounted.container.querySelector(
      '#settings-chord-roman'
    ) as HTMLInputElement | null;
    const genreSelect = mounted.container.querySelector(
      '#settings-genre'
    ) as HTMLSelectElement | null;

    expect(displayNameInput?.value).toBe('Ashlyn');
    expect(letterRadio?.checked).toBe(false);
    expect(romanRadio?.checked).toBe(true);
    expect(genreSelect?.value).toBe('Funk');
    expect(mounted.container.textContent).toContain('Device selection is not available in Settings yet.');
    expect(mounted.container.textContent).toContain('The auto-save timing is fixed in this build.');
    expect(mounted.container.textContent).toContain('Theme switching is not available in this build.');
    expect(mounted.container.querySelector('#settings-audio-output')).toBeNull();
    expect(mounted.container.querySelector('#settings-autosave')).toBeNull();
    expect(mounted.container.querySelector('#settings-theme')).toBeNull();
  });

  it('distinguishes saved, pending, and unavailable settings while a draft moves into the saved profile', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const savedState = mounted.container.querySelector(
      '[data-testid="settings-state-saved"]'
    ) as HTMLDivElement | null;
    const pendingState = mounted.container.querySelector(
      '[data-testid="settings-state-pending"]'
    ) as HTMLDivElement | null;
    const unavailableState = mounted.container.querySelector(
      '[data-testid="settings-state-unavailable"]'
    ) as HTMLDivElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const saveCaption = mounted.container.querySelector(
      '[data-testid="settings-save-caption"]'
    ) as HTMLSpanElement | null;
    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    expect(savedState?.textContent).toContain('Saved');
    expect(savedState?.textContent).toContain('3 applied');
    expect(savedState?.textContent).toContain('All editable settings match your saved profile.');
    expect(pendingState?.textContent).toContain('Pending');
    expect(pendingState?.textContent).toContain('No pending changes.');
    expect(unavailableState?.textContent).toContain('Unavailable');
    expect(unavailableState?.textContent).toContain('3 fixed today');
    expect(saveButton?.disabled).toBe(true);
    expect(saveButton?.textContent).toBe('All Changes Saved');
    expect(saveCaption?.textContent).toBe('This page already matches your saved profile settings.');

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    expect(savedState?.textContent).toContain('2 applied');
    expect(savedState?.textContent).toContain(
      '2 editable settings already match your saved profile.'
    );
    expect(pendingState?.textContent).toContain('1 waiting');
    expect(pendingState?.textContent).toContain('1 setting change is waiting to be applied.');
    expect(pendingState?.textContent).toContain('Display Name is still local until you save.');
    expect(saveButton?.disabled).toBe(false);
    expect(saveButton?.textContent).toBe('Save Pending Changes');
    expect(saveCaption?.textContent).toBe('Display Name is still waiting until you save.');

    saveResponse = {
      data: {
        id: 'user-1',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: 'Jazz',
        created_at: '2026-03-27T00:00:00Z',
        updated_at: '2026-03-30T00:00:00Z',
      },
      error: null,
    };

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(useAuthStore.getState().profile?.displayName).toBe('Ashlyn');
    expect(savedState?.textContent).toContain('3 applied');
    expect(savedState?.textContent).toContain('All editable settings match your saved profile.');
    expect(pendingState?.textContent).toContain('No pending changes.');
    expect(saveButton?.disabled).toBe(true);
    expect(saveButton?.textContent).toBe('All Changes Saved');
    expect(saveCaption?.textContent).toBe('This page already matches your saved profile settings.');
  });
});
