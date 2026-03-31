import { beforeEach, describe, expect, it } from 'vitest';
import { getAuthGateTruth, getAuthStoreTruthSlice, getAuthTruth, useAuthStore } from './auth-store';

describe('auth-store gate truth', () => {
  beforeEach(() => {
    useAuthStore.getState().beginSessionCheck();
  });

  it('stores the pending next step while session bootstrap is in progress', () => {
    expect(getAuthGateTruth(useAuthStore.getState())).toEqual({
      access: 'pending',
      currentState: 'Checking for an existing session.',
      nextStep: 'wait-for-session',
      nextStepLabel: 'Wait for session bootstrap',
      nextStepDetail: 'Wait for session bootstrap to finish.',
      signedOutReason: null,
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'checking-session',
      access: 'pending',
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
      access: 'blocked',
      currentState: 'The saved profile is missing, so the session cannot reopen yet.',
      nextStep: 'complete-profile',
      nextStepLabel: 'Complete the profile',
      nextStepDetail: 'Restore or complete the profile, then sign in again.',
      signedOutReason: 'missing-profile',
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'signed-out',
      access: 'blocked',
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
        authStatus: useAuthStore.getState().authStatus,
        signedOutReason: useAuthStore.getState().signedOutReason,
      })
    ).toEqual({
      status: 'signed-out',
      access: 'blocked',
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
      access: 'pending',
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
        access: 'granted',
        currentState: 'An authenticated session is ready.',
        nextStep: 'open-app',
        nextStepLabel: 'Open the app',
        nextStepDetail: 'Open the app.',
        signedOutReason: null,
      },
      authGate: {
        access: 'granted',
        currentState: 'An authenticated session is ready.',
        nextStep: 'open-app',
        nextStepLabel: 'Open the app',
        nextStepDetail: 'Open the app.',
        signedOutReason: null,
      },
    });
  });
});
