// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import type { Profile } from '@/types';
import SettingsPage, {
  applySavedProfile,
  createSettingsDraft,
  reconcileSettingsDraft,
  type SettingsDraft,
} from './SettingsPage';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
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

let mountedRoot: Root | null = null;
let mountedContainer: HTMLDivElement | null = null;

beforeEach(() => {
  reactActEnv.IS_REACT_ACT_ENVIRONMENT = true;
  useAuthStore.setState({
    user: { id: 'user-1', email: 'ash@example.com' } as User,
    profile: makeProfile(),
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
});
