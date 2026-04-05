// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth-store';
import { describeSettingsProfileFailureTruth } from '@/lib/profile';
import { useUiStore } from '@/store/ui-store';
import type { Profile } from '@/types';
import SettingsPage, {
  applySavedProfile,
  createSettingsDraft,
  getSettingsPageReadinessTruth,
  reconcileSettingsDraft,
  type SettingsDraft,
} from './SettingsPage';
import { getAuthTruth } from '@/store/auth-store';

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
  useAuthStore.setState(state);
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
  it('derives page readiness as ready, waiting, or blocked from the current surface truth', () => {
    const readyTruth = getSettingsPageReadinessTruth({
      authTruth: getAuthTruth({
        user: { id: 'user-1', email: 'ash@example.com' } as User,
        profile: makeProfile(),
        authStatus: 'authenticated',
        signedOutReason: null,
      }),
      failureTruth: null,
      pendingFields: [],
      profile: makeProfile(),
      saving: false,
    });

    expect(readyTruth).toEqual({
      badgeLabel: 'Ready',
      badgeVariant: 'secondary',
      detail:
        'Saved profile settings are loaded on this page. Edit any field to create a local change, then save when ready.',
      status: 'ready',
      title: 'Settings are ready',
    });

    const waitingTruth = getSettingsPageReadinessTruth({
      authTruth: getAuthTruth({
        user: null,
        profile: null,
        authStatus: 'checking-session',
        signedOutReason: null,
      }),
      failureTruth: null,
      pendingFields: [],
      profile: null,
      saving: false,
    });

    expect(waitingTruth).toEqual({
      badgeLabel: 'Waiting',
      badgeVariant: 'outline',
      detail: 'Checking for an existing session. Wait for session bootstrap to finish.',
      status: 'waiting',
      title: 'Settings are waiting',
    });

    const blockedTruth = getSettingsPageReadinessTruth({
      authTruth: getAuthTruth({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'no-session',
      }),
      failureTruth: null,
      pendingFields: [],
      profile: null,
      saving: false,
    });

    expect(blockedTruth).toEqual({
      badgeLabel: 'Blocked',
      badgeVariant: 'destructive',
      detail: 'No saved session was found. Next step: Sign in. Sign in to reopen the app.',
      status: 'blocked',
      title: 'Settings are blocked',
    });
  });

  it('promotes settings page readiness into an explicit error state when save truth fails', () => {
    const errorTruth = getSettingsPageReadinessTruth({
      authTruth: getAuthTruth({
        user: { id: 'user-1', email: 'ash@example.com' } as User,
        profile: makeProfile(),
        authStatus: 'authenticated',
        signedOutReason: null,
      }),
      failureTruth: {
        title: 'Settings save failed',
        currentState: 'The profile save request failed: generator offline',
        nextStep:
          'Your last confirmed saved settings remain loaded. Fix the save failure, then try saving these pending changes again.',
      },
      pendingFields: ['displayName'],
      profile: makeProfile(),
      saving: false,
    });

    expect(errorTruth).toEqual({
      badgeLabel: 'Error',
      badgeVariant: 'destructive',
      detail:
        'The profile save request failed: generator offline Next step: Your last confirmed saved settings remain loaded. Fix the save failure, then try saving these pending changes again.',
      status: 'error',
      title: 'Settings save failed',
    });
  });

  it('keeps first-save validation failure truth explicit when no saved profile exists yet', () => {
    expect(
      describeSettingsProfileFailureTruth({
        detail: 'Profile save succeeded but no persisted profile row was returned.',
        hasSavedProfile: false,
        kind: 'missing-saved-row',
      })
    ).toEqual({
      title: 'Saved profile could not be confirmed',
      currentState: 'Profile save succeeded but no persisted profile row was returned.',
      nextStep:
        'These settings are still local only. Retry the save until the persisted profile row comes back for validation.',
    });
  });

  it('renders unsupported settings as truthful status instead of fake disabled controls', () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const pageReadiness = mounted.container.querySelector(
      '[data-testid="settings-page-readiness"]'
    ) as HTMLDivElement | null;

    expect(pageReadiness?.getAttribute('data-settings-page-readiness')).toBe('ready');
    expect(pageReadiness?.textContent).toContain('Settings are ready');
    expect(pageReadiness?.textContent).toContain('Ready');
    expect(pageReadiness?.textContent).toContain('Saved profile settings are loaded on this page.');

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

  it('shows profile validation truth before save so supported settings are explicit on the page', () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const chordSelectionTruth = mounted.container.querySelector(
      '[data-testid="settings-chord-selection-truth"]'
    ) as HTMLDivElement | null;
    const genreSelectionTruth = mounted.container.querySelector(
      '[data-testid="settings-genre-selection-truth"]'
    ) as HTMLDivElement | null;

    expect(mounted.container.textContent).toContain(
      'Saved profile truth for this field stays simple: Display names may be left blank and save exactly as entered.'
    );
    expect(mounted.container.textContent).toContain(
      'Saved profile validation only accepts chord modes letter (Letter names) or roman (Roman numerals) and default genres from the supported list below.'
    );
    expect(mounted.container.textContent).toContain(
      'Saved now as "Doug". Edit this field to change the saved display name.'
    );
    expect(mounted.container.textContent).toContain(
      'Saved now as Letter names. Choose a different option here to update the saved chord display mode.'
    );
    expect(chordSelectionTruth?.textContent).toContain('Saved selection');
    expect(chordSelectionTruth?.textContent).toContain(
      'Letter names is the saved chord display mode currently selected on this page.'
    );
    expect(mounted.container.textContent).toContain(
      'Pre-selected when creating a new project. Saved profile truth accepts Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, or Pop. Saved now as Jazz. Choose a different genre here to update the saved project default.'
    );
    expect(genreSelectionTruth?.textContent).toContain('Saved selection');
    expect(genreSelectionTruth?.textContent).toContain(
      'Jazz is the saved default genre currently selected on this page.'
    );
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
    expect(mounted.container.textContent).toContain(
      'Saved now as "Doug". Next save will store "Ashlyn" as the display name.'
    );
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

  it('states when a selected control value is still the unsaved default instead of a saved profile choice', () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' } as User,
      profile: null,
      authStatus: 'authenticated',
      signedOutReason: null,
    });

    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const chordSelectionTruth = mounted.container.querySelector(
      '[data-testid="settings-chord-selection-truth"]'
    ) as HTMLDivElement | null;
    const genreSelectionTruth = mounted.container.querySelector(
      '[data-testid="settings-genre-selection-truth"]'
    ) as HTMLDivElement | null;

    expect(chordSelectionTruth?.textContent).toContain('Default now');
    expect(chordSelectionTruth?.textContent).toContain(
      'Letter names is selected on this page as the default chord display mode until you save a profile.'
    );
    expect(genreSelectionTruth?.textContent).toContain('No default');
    expect(genreSelectionTruth?.textContent).toContain(
      'No default genre is selected yet, so new projects stay unset until you choose one and save.'
    );
  });

  it('shows an explicit error when the saved profile row comes back with invalid settings truth', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    saveResponse = {
      data: {
        id: 'user-1',
        display_name: 'Ashlyn',
        chord_display_mode: 'solfege',
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

    expect(mounted.container.textContent).toContain(
      'Invalid profile chord display mode: solfege. Supported modes: letter (Letter names) or roman (Roman numerals).'
    );
    expect(useAuthStore.getState().profile?.displayName).toBe('Doug');
    expect(saveButton?.disabled).toBe(false);
    expect(saveButton?.textContent).toBe('Save Pending Changes');
  });

  it('shows the supported genres when the saved profile row comes back with an invalid default genre', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    saveResponse = {
      data: {
        id: 'user-1',
        display_name: 'Ashlyn',
        chord_display_mode: 'letter',
        default_genre: 'Trap Metal',
        created_at: '2026-03-27T00:00:00Z',
        updated_at: '2026-03-30T00:00:00Z',
      },
      error: null,
    };

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(mounted.container.textContent).toContain(
      'Invalid profile default genre: Trap Metal. Supported genres: Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, or Pop.'
    );
    expect(useAuthStore.getState().profile?.displayName).toBe('Doug');
  });

  it('shows an explicit error when the saved profile row is missing required profile fields', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    saveResponse = {
      data: {
        id: '',
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

    expect(mounted.container.textContent).toContain('Invalid profile id: ');
    expect(useAuthStore.getState().profile?.displayName).toBe('Doug');
    expect(saveButton?.disabled).toBe(false);
    expect(saveButton?.textContent).toBe('Save Pending Changes');
  });

  it('keeps the save failure explicit when the profile update request is rejected', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const pageReadiness = mounted.container.querySelector(
      '[data-testid="settings-page-readiness"]'
    ) as HTMLDivElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    saveResponse = {
      data: null,
      error: {
        message: 'new row violates row-level security policy for table "profiles"',
      },
    };

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(mounted.container.textContent).toContain(
      'new row violates row-level security policy for table "profiles"'
    );
    expect(pageReadiness?.getAttribute('data-settings-page-readiness')).toBe('error');
    expect(pageReadiness?.textContent).toContain('Settings save failed');
    expect(pageReadiness?.textContent).toContain('Error');
    expect(pageReadiness?.textContent).toContain(
      'Your last confirmed saved settings remain loaded. Fix the save failure, then try saving these pending changes again.'
    );
    expect(useAuthStore.getState().profile?.displayName).toBe('Doug');
    expect(saveButton?.disabled).toBe(false);
    expect(saveButton?.textContent).toBe('Save Pending Changes');
  });

  it('states when the save succeeded but no persisted profile row came back to validate', async () => {
    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const pageReadiness = mounted.container.querySelector(
      '[data-testid="settings-page-readiness"]'
    ) as HTMLDivElement | null;
    const form = mounted.container.querySelector('form') as HTMLFormElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    saveResponse = {
      data: null,
      error: null,
    };

    await act(async () => {
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await flushAsyncWork();
    });

    expect(mounted.container.textContent).toContain(
      'Profile save succeeded but no persisted profile row was returned.'
    );
    expect(pageReadiness?.getAttribute('data-settings-page-readiness')).toBe('error');
    expect(pageReadiness?.textContent).toContain('Saved profile could not be confirmed');
    expect(pageReadiness?.textContent).toContain(
      'Your last confirmed saved settings remain loaded. Retry the save until the persisted profile row comes back for validation.'
    );
    expect(useAuthStore.getState().profile?.displayName).toBe('Doug');
    expect(saveButton?.disabled).toBe(false);
    expect(saveButton?.textContent).toBe('Save Pending Changes');
  });

  it('shows when pending settings are blocked by sign-in state instead of pretending save can run', () => {
    setAuthStoreFixture({
      user: null,
      profile: null,
      authStatus: 'signed-out',
      signedOutReason: 'no-session',
    });

    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const displayNameInput = mounted.container.querySelector(
      '#settings-display-name'
    ) as HTMLInputElement | null;
    const saveButton = mounted.container.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement | null;
    const saveCaption = mounted.container.querySelector(
      '[data-testid="settings-save-caption"]'
    ) as HTMLSpanElement | null;

    act(() => {
      if (!displayNameInput) {
        throw new Error('Expected display name input');
      }

      setInputValue(displayNameInput, 'Ashlyn');
    });

    const saveReadiness = mounted.container.querySelector(
      '[data-testid="settings-save-readiness"]'
    ) as HTMLDivElement | null;
    const pageReadiness = mounted.container.querySelector(
      '[data-testid="settings-page-readiness"]'
    ) as HTMLDivElement | null;

    expect(pageReadiness?.getAttribute('data-settings-page-readiness')).toBe('blocked');
    expect(pageReadiness?.textContent).toContain('Settings are blocked');
    expect(pageReadiness?.textContent).toContain('Blocked');
    expect(pageReadiness?.textContent).toContain('No saved session was found.');
    expect(pageReadiness?.textContent).toContain('Next step: Sign in. Sign in to reopen the app.');
    expect(saveReadiness?.textContent).toContain('Save is blocked');
    expect(saveReadiness?.textContent).toContain('Blocked');
    expect(saveReadiness?.textContent).toContain('No saved session was found.');
    expect(saveReadiness?.textContent).toContain(
      'Sign in to reopen the app. Pending changes stay local until saving is unblocked.'
    );
    expect(saveButton?.disabled).toBe(true);
    expect(saveButton?.textContent).toBe('Save Blocked');
    expect(saveCaption?.textContent).toBe(
      'Sign in to reopen the app. Pending changes stay local until saving is unblocked.'
    );
  });

  it('states what the first saved profile will contain when no profile exists yet', () => {
    setAuthStoreFixture({
      user: { id: 'user-1', email: 'ash@example.com' } as User,
      profile: null,
      authStatus: 'authenticated',
      signedOutReason: null,
    });

    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    expect(mounted.container.textContent).toContain(
      'No saved display name exists yet. The first save will create the profile with blank as the display name.'
    );
    expect(mounted.container.textContent).toContain(
      'No saved chord display mode exists yet. The first save will create the profile with Letter names as the chord display mode.'
    );
    expect(mounted.container.textContent).toContain(
      'Pre-selected when creating a new project. Saved profile truth accepts Jazz, Blues, Rock, Funk, Country, Gospel, R&B, Latin, or Pop. No saved default genre exists yet. The first save will create the profile with no default genre for new projects.'
    );
  });

  it('keeps the page visibly waiting while session bootstrap is still unresolved', () => {
    setAuthStoreFixture({
      user: null,
      profile: null,
      authStatus: 'checking-session',
      signedOutReason: null,
    });

    const mounted = renderSettingsPage();
    mountedRoot = mounted.root;
    mountedContainer = mounted.container;

    const pageReadiness = mounted.container.querySelector(
      '[data-testid="settings-page-readiness"]'
    ) as HTMLDivElement | null;

    expect(pageReadiness?.getAttribute('data-settings-page-readiness')).toBe('waiting');
    expect(pageReadiness?.textContent).toContain('Settings are waiting');
    expect(pageReadiness?.textContent).toContain('Waiting');
    expect(pageReadiness?.textContent).toContain('Checking for an existing session.');
    expect(pageReadiness?.textContent).toContain('Wait for session bootstrap to finish.');
  });
});
