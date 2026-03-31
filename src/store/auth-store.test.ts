import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';

describe('auth-store gate truth', () => {
  beforeEach(() => {
    useAuthStore.getState().beginSessionCheck();
  });

  it('stores the pending next step while session bootstrap is in progress', () => {
    expect(useAuthStore.getState().authGate).toEqual({
      access: 'pending',
      nextStep: 'wait-for-session',
      signedOutReason: null,
    });
  });

  it('stores the blocked recovery step when authentication is cleared', () => {
    useAuthStore.getState().setSignedOut('missing-profile');

    expect(useAuthStore.getState().authGate).toEqual({
      access: 'blocked',
      nextStep: 'complete-profile',
      signedOutReason: 'missing-profile',
    });
  });
});
