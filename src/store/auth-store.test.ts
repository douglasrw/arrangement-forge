import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAuthGateTruth,
  getAuthStoreTruthSlice,
  getAuthTruth,
  selectAuthStoreTruthSlice,
  shouldPreserveSignedOutTruthOnTrailingSignOut,
  useAuthStore,
} from './auth-store';

describe('auth-store gate truth', () => {
  beforeEach(() => {
    useAuthStore.getState().beginSessionCheck();
  });

  it('stores the pending next step while session bootstrap is in progress', () => {
    expect(getAuthGateTruth(useAuthStore.getState())).toEqual({
      readiness: 'waiting',
      access: 'pending',
      blockingState: 'none',
      currentState: 'Checking for an existing session.',
      nextStep: 'wait-for-session',
      nextStepLabel: 'Wait for session bootstrap',
      nextStepDetail: 'Wait for session bootstrap to finish.',
      signedOutReason: null,
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'checking-session',
      readiness: 'waiting',
      access: 'pending',
      blockingState: 'none',
      currentState: 'Checking for an existing session.',
      nextStep: 'wait-for-session',
      nextStepLabel: 'Wait for session bootstrap',
      nextStepDetail: 'Wait for session bootstrap to finish.',
      signedOutReason: null,
    });
  });

  it('stores the blocked recovery step when authentication is cleared', () => {
    useAuthStore.getState().setSignedOut('missing-profile');

    expect(getAuthGateTruth(useAuthStore.getState())).toEqual({
      readiness: 'blocked',
      access: 'blocked',
      blockingState: 'error',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'signed-out',
      readiness: 'blocked',
      access: 'blocked',
      blockingState: 'error',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
  });

  it('combines the current auth status and next step in one explicit truth surface', () => {
    useAuthStore.getState().setSignedOut('missing-profile');

    expect(
      getAuthTruth({
        user: useAuthStore.getState().user,
        profile: useAuthStore.getState().profile,
        authStatus: useAuthStore.getState().authStatus,
        signedOutReason: useAuthStore.getState().signedOutReason,
      })
    ).toEqual({
      status: 'signed-out',
      readiness: 'blocked',
      access: 'blocked',
      blockingState: 'error',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
  });

  it('keeps the persisted store focused on raw auth state instead of duplicated truth snapshots', () => {
    const state = useAuthStore.getState();

    expect('authTruth' in state).toBe(false);
    expect('authGate' in state).toBe(false);
    expect(getAuthTruth(state)).toEqual({
      status: 'checking-session',
      readiness: 'waiting',
      access: 'pending',
      blockingState: 'none',
      currentState: 'Checking for an existing session.',
      nextStep: 'wait-for-session',
      nextStepLabel: 'Wait for session bootstrap',
      nextStepDetail: 'Wait for session bootstrap to finish.',
      signedOutReason: null,
    });
  });

  it('names the immediate recovery action so auth consumers do not have to infer it from prose', () => {
    useAuthStore.getState().setSignedOut('session-lookup-failed');

    expect(getAuthTruth(useAuthStore.getState())).toMatchObject({
      nextStep: 'retry-session',
      nextStepLabel: 'Retry session restore',
      nextStepDetail: 'Retry session restoration by signing in again.',
    });
  });

  it('keeps incomplete authenticated state blocked until both user and profile are present', () => {
    expect(
      getAuthTruth({
        user: { id: 'user-1' } as const,
        profile: null,
        authStatus: 'authenticated',
        signedOutReason: null,
      })
    ).toEqual({
      status: 'signed-out',
      readiness: 'blocked',
      access: 'blocked',
      blockingState: 'error',
      currentState: 'The saved session is incomplete, so access is still blocked.',
      nextStep: 'sign-in',
      nextStepLabel: 'Sign in again',
      nextStepDetail: 'Sign in again to restore a complete session.',
      signedOutReason: null,
    });
  });

  it('derives auth gate and auth truth from one shared state definition across statuses', () => {
    expect(getAuthTruth(useAuthStore.getState())).toMatchObject(getAuthGateTruth(useAuthStore.getState()));

    useAuthStore.getState().completeAuthenticatedSession({
      user: { id: 'user-1' } as const,
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
    });

    expect(getAuthTruth(useAuthStore.getState())).toMatchObject(getAuthGateTruth(useAuthStore.getState()));

    useAuthStore.getState().setSignedOut('profile-load-failed');

    expect(getAuthTruth(useAuthStore.getState())).toMatchObject(getAuthGateTruth(useAuthStore.getState()));
  });

  it('names when a trailing sign-out must preserve the bootstrap truth instead of flattening it', () => {
    useAuthStore.getState().setSignedOut('missing-profile');

    expect(shouldPreserveSignedOutTruthOnTrailingSignOut(useAuthStore.getState())).toBe(true);
    expect(
      shouldPreserveSignedOutTruthOnTrailingSignOut({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'signed-out',
      })
    ).toBe(false);
    expect(
      shouldPreserveSignedOutTruthOnTrailingSignOut({
        user: { id: 'user-1' } as const,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: 'missing-profile',
      })
    ).toBe(false);
  });

  it('exposes one named auth slice with user, current state, and next step', () => {
    const user = { id: 'user-1' } as const;
    const profile = {
      id: 'user-1',
      displayName: 'Ashlyn',
      chordDisplayMode: 'roman',
      defaultGenre: 'Pop',
      createdAt: '2026-03-29T00:00:00Z',
      updatedAt: '2026-03-29T01:00:00Z',
    };

    useAuthStore.getState().completeAuthenticatedSession({ user, profile });

    expect(getAuthStoreTruthSlice(useAuthStore.getState())).toEqual({
      user,
      profile,
      authTruth: {
        status: 'authenticated',
        readiness: 'ready',
        access: 'granted',
        blockingState: 'none',
        currentState: 'An authenticated session is ready.',
        nextStep: 'open-app',
        nextStepLabel: 'Open the app',
        nextStepDetail: 'Open the app.',
        signedOutReason: null,
      },
    });
  });

  it('returns a stable auth truth slice reference until the underlying auth truth changes', () => {
    const initialState = useAuthStore.getState();

    const firstSlice = getAuthStoreTruthSlice(initialState);
    const secondSlice = selectAuthStoreTruthSlice(initialState);
    const repeatedSlice = selectAuthStoreTruthSlice({
      user: initialState.user,
      profile: initialState.profile,
      authStatus: initialState.authStatus,
      signedOutReason: initialState.signedOutReason,
    });

    expect(secondSlice).toBe(repeatedSlice);
    expect(secondSlice).toEqual(firstSlice);

    useAuthStore.getState().setSignedOut('profile-load-failed');

    const updatedState = useAuthStore.getState();
    const updatedSlice = selectAuthStoreTruthSlice(updatedState);

    expect(updatedSlice).not.toBe(secondSlice);
    expect(updatedSlice).toEqual({
      user: null,
      profile: null,
      authTruth: {
        status: 'signed-out',
        readiness: 'blocked',
        access: 'blocked',
        blockingState: 'error',
        currentState: 'The saved profile could not be loaded.',
        nextStep: 'retry-profile-load',
        nextStepLabel: 'Retry the profile load',
        nextStepDetail: 'Retry the profile load by signing in again.',
        signedOutReason: 'profile-load-failed',
      },
    });
  });

  it('exposes ready, waiting, and blocked auth readiness directly from the truth surface', () => {
    expect(getAuthStoreTruthSlice(useAuthStore.getState()).authTruth.readiness).toBe('waiting');

    useAuthStore.getState().completeAuthenticatedSession({
      user: { id: 'user-1' } as const,
      profile: {
        id: 'user-1',
        displayName: 'Ashlyn',
        chordDisplayMode: 'roman',
        defaultGenre: 'Pop',
        createdAt: '2026-03-29T00:00:00Z',
        updatedAt: '2026-03-29T01:00:00Z',
      },
    });

    expect(getAuthStoreTruthSlice(useAuthStore.getState()).authTruth.readiness).toBe('ready');

    useAuthStore.getState().setSignedOut('session-lookup-failed');

    expect(getAuthStoreTruthSlice(useAuthStore.getState()).authTruth.readiness).toBe('blocked');
  });
});
