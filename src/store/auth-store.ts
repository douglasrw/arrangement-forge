// auth-store.ts — Zustand store for Supabase authentication state.

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

export type AuthStatus = 'checking-session' | 'authenticated' | 'signed-out';
export type AuthGateAccess = 'pending' | 'granted' | 'blocked';
export type AuthReadiness = 'waiting' | 'ready' | 'blocked';
export type AuthBlockingState = 'none' | 'signed-out' | 'error';

export type SignedOutReason =
  | 'no-session'
  | 'signed-out'
  | 'email-confirmation-required'
  | 'missing-profile'
  | 'profile-load-failed'
  | 'session-lookup-failed';

export type AuthGateNextStep =
  | 'wait-for-session'
  | 'open-app'
  | 'sign-in'
  | 'confirm-email'
  | 'complete-profile'
  | 'retry-profile-load'
  | 'retry-session';

export interface AuthGateTruth {
  readiness: AuthReadiness;
  access: AuthGateAccess;
  blockingState: AuthBlockingState;
  currentState: string;
  nextStep: AuthGateNextStep;
  nextStepLabel: string;
  nextStepDetail: string;
  signedOutReason: SignedOutReason | null;
}

export interface AuthTruth extends AuthGateTruth {
  status: AuthStatus;
}

export interface AuthStoreTruthSlice {
  user: User | null;
  profile: Profile | null;
  authTruth: AuthTruth;
}

type AuthStoreTruthSliceState = Pick<
  AuthStoreState,
  'user' | 'profile' | 'authStatus' | 'signedOutReason'
>;

type AuthTruthState = Pick<
  AuthStoreState,
  'user' | 'profile' | 'authStatus' | 'signedOutReason'
>;

type AuthGateDefinition = Omit<AuthGateTruth, 'signedOutReason'>;

const CHECKING_SESSION_AUTH_GATE: AuthGateDefinition = {
  readiness: 'waiting',
  access: 'pending',
  blockingState: 'none',
  currentState: 'Checking for an existing session.',
  nextStep: 'wait-for-session',
  nextStepLabel: 'Wait for session bootstrap',
  nextStepDetail: 'Wait for session bootstrap to finish.',
};

const AUTHENTICATED_AUTH_GATE: AuthGateDefinition = {
  readiness: 'ready',
  access: 'granted',
  blockingState: 'none',
  currentState: 'An authenticated session is ready.',
  nextStep: 'open-app',
  nextStepLabel: 'Open the app',
  nextStepDetail: 'Open the app.',
};

const INCOMPLETE_AUTHENTICATED_AUTH_GATE: AuthGateDefinition = {
  readiness: 'blocked',
  access: 'blocked',
  blockingState: 'error',
  currentState: 'The saved session is incomplete, so access is still blocked.',
  nextStep: 'sign-in',
  nextStepLabel: 'Sign in again',
  nextStepDetail: 'Sign in again to restore a complete session.',
};

const SIGNED_OUT_AUTH_GATES: Record<SignedOutReason, AuthGateDefinition> = {
  'no-session': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'signed-out',
    currentState: 'No saved session was found.',
    nextStep: 'sign-in',
    nextStepLabel: 'Sign in',
    nextStepDetail: 'Sign in to reopen the app.',
  },
  'signed-out': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'signed-out',
    currentState: 'The previous session has been signed out.',
    nextStep: 'sign-in',
    nextStepLabel: 'Sign in again',
    nextStepDetail: 'Sign in again to continue.',
  },
  'email-confirmation-required': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'signed-out',
    currentState: 'Email confirmation is still required before a session can start.',
    nextStep: 'confirm-email',
    nextStepLabel: 'Confirm your email',
    nextStepDetail: 'Open the confirmation email, then sign in again.',
  },
  'missing-profile': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'error',
    currentState: 'The saved profile is missing, so the session cannot reopen yet.',
    nextStep: 'complete-profile',
    nextStepLabel: 'Complete the profile',
    nextStepDetail: 'Restore or complete the profile, then sign in again.',
  },
  'profile-load-failed': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'error',
    currentState: 'The saved profile could not be loaded.',
    nextStep: 'retry-profile-load',
    nextStepLabel: 'Retry the profile load',
    nextStepDetail: 'Retry the profile load by signing in again.',
  },
  'session-lookup-failed': {
    readiness: 'blocked',
    access: 'blocked',
    blockingState: 'error',
    currentState: 'The previous session could not be restored.',
    nextStep: 'retry-session',
    nextStepLabel: 'Retry session restore',
    nextStepDetail: 'Retry session restoration by signing in again.',
  },
};

const SIGNED_OUT_WITHOUT_REASON_AUTH_GATE: AuthGateDefinition = {
  readiness: 'blocked',
  access: 'blocked',
  blockingState: 'signed-out',
  currentState: 'Authentication is blocked until a new session starts.',
  nextStep: 'sign-in',
  nextStepLabel: 'Sign in',
  nextStepDetail: 'Sign in to continue.',
};

type AuthStoreState = {
  user: User | null;
  profile: Profile | null;
  authStatus: AuthStatus;
  signedOutReason: SignedOutReason | null;
};

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  authStatus: AuthStatus;
  signedOutReason: SignedOutReason | null;

  beginSessionCheck: () => void;
  completeAuthenticatedSession: (session: { user: User; profile: Profile }) => void;
  setProfile: (profile: Profile) => void;
  setSignedOut: (reason: SignedOutReason) => void;
}

function createAuthGateTruth(
  definition: AuthGateDefinition,
  signedOutReason: SignedOutReason | null
): AuthGateTruth {
  return {
    ...definition,
    signedOutReason,
  };
}

function createAuthTruth(
  status: AuthStatus,
  definition: AuthGateDefinition,
  signedOutReason: SignedOutReason | null
): AuthTruth {
  return {
    status,
    ...createAuthGateTruth(definition, signedOutReason),
  };
}

const CHECKING_SESSION_AUTH_GATE_TRUTH = createAuthGateTruth(CHECKING_SESSION_AUTH_GATE, null);
const AUTHENTICATED_AUTH_GATE_TRUTH = createAuthGateTruth(AUTHENTICATED_AUTH_GATE, null);
const INCOMPLETE_AUTHENTICATED_AUTH_GATE_TRUTH = createAuthGateTruth(
  INCOMPLETE_AUTHENTICATED_AUTH_GATE,
  null
);
const SIGNED_OUT_AUTH_GATE_TRUTHS: Record<SignedOutReason, AuthGateTruth> = {
  'no-session': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['no-session'], 'no-session'),
  'signed-out': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['signed-out'], 'signed-out'),
  'email-confirmation-required': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['email-confirmation-required'],
    'email-confirmation-required'
  ),
  'missing-profile': createAuthGateTruth(SIGNED_OUT_AUTH_GATES['missing-profile'], 'missing-profile'),
  'profile-load-failed': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['profile-load-failed'],
    'profile-load-failed'
  ),
  'session-lookup-failed': createAuthGateTruth(
    SIGNED_OUT_AUTH_GATES['session-lookup-failed'],
    'session-lookup-failed'
  ),
};
const SIGNED_OUT_WITHOUT_REASON_AUTH_GATE_TRUTH = createAuthGateTruth(
  SIGNED_OUT_WITHOUT_REASON_AUTH_GATE,
  null
);
const CHECKING_SESSION_AUTH_TRUTH = createAuthTruth('checking-session', CHECKING_SESSION_AUTH_GATE, null);
const AUTHENTICATED_AUTH_TRUTH = createAuthTruth('authenticated', AUTHENTICATED_AUTH_GATE, null);
const INCOMPLETE_AUTHENTICATED_AUTH_TRUTH = createAuthTruth(
  'signed-out',
  INCOMPLETE_AUTHENTICATED_AUTH_GATE,
  null
);
const SIGNED_OUT_AUTH_TRUTHS: Record<SignedOutReason, AuthTruth> = {
  'no-session': createAuthTruth('signed-out', SIGNED_OUT_AUTH_GATES['no-session'], 'no-session'),
  'signed-out': createAuthTruth('signed-out', SIGNED_OUT_AUTH_GATES['signed-out'], 'signed-out'),
  'email-confirmation-required': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['email-confirmation-required'],
    'email-confirmation-required'
  ),
  'missing-profile': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['missing-profile'],
    'missing-profile'
  ),
  'profile-load-failed': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['profile-load-failed'],
    'profile-load-failed'
  ),
  'session-lookup-failed': createAuthTruth(
    'signed-out',
    SIGNED_OUT_AUTH_GATES['session-lookup-failed'],
    'session-lookup-failed'
  ),
};
const SIGNED_OUT_WITHOUT_REASON_AUTH_TRUTH = createAuthTruth(
  'signed-out',
  SIGNED_OUT_WITHOUT_REASON_AUTH_GATE,
  null
);

// Keep auth gating and the operator's next step derivable from one shared surface.
export function getAuthGateTruth({
  user,
  profile,
  authStatus,
  signedOutReason,
}: AuthTruthState): AuthGateTruth {
  switch (authStatus) {
    case 'checking-session':
      return CHECKING_SESSION_AUTH_GATE_TRUTH;
    case 'authenticated':
      return user && profile
        ? AUTHENTICATED_AUTH_GATE_TRUTH
        : INCOMPLETE_AUTHENTICATED_AUTH_GATE_TRUTH;
    default:
      return signedOutReason
        ? SIGNED_OUT_AUTH_GATE_TRUTHS[signedOutReason]
        : SIGNED_OUT_WITHOUT_REASON_AUTH_GATE_TRUTH;
  }
}

export function selectAuthGateTruth(
  state: AuthTruthState
): AuthGateTruth {
  return getAuthGateTruth(state);
}

export function getAuthTruth(
  state: AuthTruthState
): AuthTruth {
  switch (state.authStatus) {
    case 'checking-session':
      return CHECKING_SESSION_AUTH_TRUTH;
    case 'authenticated':
      return state.user && state.profile
        ? AUTHENTICATED_AUTH_TRUTH
        : INCOMPLETE_AUTHENTICATED_AUTH_TRUTH;
    default:
      return state.signedOutReason
        ? SIGNED_OUT_AUTH_TRUTHS[state.signedOutReason]
        : SIGNED_OUT_WITHOUT_REASON_AUTH_TRUTH;
  }
}

export function selectAuthTruth(
  state: AuthTruthState
): AuthTruth {
  return getAuthTruth(state);
}

export function shouldPreserveSignedOutTruthOnTrailingSignOut(
  state: AuthTruthState
): boolean {
  const authTruth = getAuthTruth(state);

  return (
    authTruth.status === 'signed-out'
    && authTruth.signedOutReason !== null
    && authTruth.signedOutReason !== 'signed-out'
    && !state.user
    && !state.profile
  );
}

export function getAuthStoreTruthSlice(
  state: AuthStoreTruthSliceState
): AuthStoreTruthSlice {
  return {
    user: state.user,
    profile: state.profile,
    authTruth: getAuthTruth(state),
  };
}

let cachedAuthStoreTruthSliceState: AuthStoreTruthSliceState | null = null;
let cachedAuthStoreTruthSlice: AuthStoreTruthSlice | null = null;

export function selectAuthStoreTruthSlice(
  state: AuthStoreTruthSliceState
): AuthStoreTruthSlice {
  if (
    cachedAuthStoreTruthSliceState &&
    cachedAuthStoreTruthSlice &&
    cachedAuthStoreTruthSliceState.user === state.user &&
    cachedAuthStoreTruthSliceState.profile === state.profile &&
    cachedAuthStoreTruthSliceState.authStatus === state.authStatus &&
    cachedAuthStoreTruthSliceState.signedOutReason === state.signedOutReason
  ) {
    return cachedAuthStoreTruthSlice;
  }

  cachedAuthStoreTruthSliceState = {
    user: state.user,
    profile: state.profile,
    authStatus: state.authStatus,
    signedOutReason: state.signedOutReason,
  };
  cachedAuthStoreTruthSlice = getAuthStoreTruthSlice(state);
  return cachedAuthStoreTruthSlice;
}

function createAuthStoreState(overrides: AuthStoreState): AuthStoreState {
  return {
    ...overrides,
  };
}

export const useAuthStore = create<AuthStore>()((set) => ({
  ...createAuthStoreState({
    user: null,
    profile: null,
    authStatus: 'checking-session',
    signedOutReason: null,
  }),

  beginSessionCheck: () =>
    set(
      createAuthStoreState({
        user: null,
        profile: null,
        authStatus: 'checking-session',
        signedOutReason: null,
      })
    ),
  completeAuthenticatedSession: ({ user, profile }) =>
    set(
      createAuthStoreState({
        user,
        profile,
        authStatus: 'authenticated',
        signedOutReason: null,
      })
    ),
  setProfile: (profile) => set({ profile }),
  setSignedOut: (reason) =>
    set(
      createAuthStoreState({
        user: null,
        profile: null,
        authStatus: 'signed-out',
        signedOutReason: reason,
      })
    ),
}));
