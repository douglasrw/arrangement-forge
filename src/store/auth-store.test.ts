import { beforeEach, describe, expect, it } from 'vitest';
import { getAuthGateTruth, getAuthStoreTruthSlice, getAuthTruth, useAuthStore } from './auth-store';

describe('auth-store gate truth', () => {
  beforeEach(() => {
    useAuthStore.getState().beginSessionCheck();
  });

  it('stores the pending next step while session bootstrap is in progress', () => {
    expect(getAuthGateTruth(useAuthStore.getState())).toEqual({
      access: 'pending',
      nextStep: 'wait-for-session',
      signedOutReason: null,
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'checking-session',
      access: 'pending',
      nextStep: 'wait-for-session',
      signedOutReason: null,
    });
  });

  it('stores the blocked recovery step when authentication is cleared', () => {
    useAuthStore.getState().setSignedOut('missing-profile');

    expect(getAuthGateTruth(useAuthStore.getState())).toEqual({
      access: 'blocked',
      nextStep: 'complete-profile',
      signedOutReason: 'missing-profile',
    });
    expect(getAuthTruth(useAuthStore.getState())).toEqual({
      status: 'signed-out',
      access: 'blocked',
      nextStep: 'complete-profile',
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
      nextStep: 'complete-profile',
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
      nextStep: 'wait-for-session',
      signedOutReason: null,
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
        nextStep: 'open-app',
        signedOutReason: null,
      },
      authGate: {
        access: 'granted',
        nextStep: 'open-app',
        signedOutReason: null,
      },
    });
  });
});
