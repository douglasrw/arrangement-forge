// useAuth.ts — Auth initialization and actions, connecting Supabase Auth to Zustand.

import { useCallback, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useShallow } from 'zustand/react/shallow';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/profile';
import type {
  AuthStoreTruthSlice,
  AuthTruth,
  SignedOutReason,
} from '@/store/auth-store';
import { selectAuthStoreTruthSlice } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

export type SignUpResult = { status: 'session-pending' } | { status: 'confirmation-required' };
export type UseAuthResult = {
  user: User | null;
  profile: ReturnType<typeof useAuthStore.getState>['profile'];
  authStoreTruth: AuthStoreTruthSlice;
  authTruth: AuthTruth;
  initAuth: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loadProfile: (userId?: string) => Promise<ReturnType<typeof rowToProfile> | null>;
};

type HydrationResult =
  | { status: 'authenticated' }
  | { status: 'signed-out'; reason: SignedOutReason }
  | { status: 'stale' };

export function useAuth(): UseAuthResult {
  const authStoreTruth = useAuthStore(useShallow(selectAuthStoreTruthSlice));
  const { user, profile, authTruth } = authStoreTruth;
  const authTransitionIdRef = useRef(0);

  const beginSessionCheck = useCallback(() => {
    authTransitionIdRef.current += 1;
    useAuthStore.getState().beginSessionCheck();
    return authTransitionIdRef.current;
  }, []);

  const clearSessionState = useCallback((reason: SignedOutReason) => {
    authTransitionIdRef.current += 1;
    useAuthStore.getState().setSignedOut(reason);
    useUiStore.getState().setChordDisplayMode('letter');
  }, []);

  const loadProfile = useCallback(async (userId?: string) => {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

    if (!resolvedUserId) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', resolvedUserId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const profile = rowToProfile(data as Record<string, unknown>);
    return profile;
  }, []);

  const hydrateSession = useCallback(
    async (user: User, transitionId: number): Promise<HydrationResult> => {
      try {
        const profile = await loadProfile(user.id);

        if (transitionId !== authTransitionIdRef.current) {
          return {
            status: 'stale',
          };
        }

        if (!profile) {
          return {
            status: 'signed-out' as const,
            reason: 'missing-profile' as const,
          };
        }

        useAuthStore.getState().completeAuthenticatedSession({ user, profile });
        useUiStore.getState().setChordDisplayMode(profile.chordDisplayMode);

        return {
          status: 'authenticated',
        };
      } catch {
        if (transitionId !== authTransitionIdRef.current) {
          return {
            status: 'stale',
          };
        }

        return {
          status: 'signed-out' as const,
          reason: 'profile-load-failed' as const,
        };
      }
    },
    [loadProfile]
  );

  const initAuth = useCallback(() => {
    const initialTransitionId = beginSessionCheck();
    let isActive = true;

    void supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!isActive || initialTransitionId !== authTransitionIdRef.current) return;

        if (session?.user) {
          const hydrationResult = await hydrateSession(session.user, initialTransitionId);
          if (isActive && hydrationResult.status === 'signed-out') {
            clearSessionState(hydrationResult.reason);
          }
        } else {
          clearSessionState('no-session');
        }
      })
      .catch(() => {
        if (isActive && initialTransitionId === authTransitionIdRef.current) {
          clearSessionState('session-lookup-failed');
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const transitionId = beginSessionCheck();
        void hydrateSession(session.user, transitionId).then((hydrationResult) => {
          if (hydrationResult.status === 'signed-out') {
            clearSessionState(hydrationResult.reason);
          }
        });
      } else if (event === 'SIGNED_OUT') {
        const { authStatus, signedOutReason, user, profile } = useAuthStore.getState();

        // Preserve the more specific bootstrap truth when no prior session existed.
        if (
          authStatus === 'signed-out'
          && signedOutReason === 'no-session'
          && !user
          && !profile
        ) {
          return;
        }

        clearSessionState('signed-out');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [beginSessionCheck, clearSessionState, hydrateSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session?.user) {
        beginSessionCheck();
      }
    },
    [beginSessionCheck]
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session?.user) {
        beginSessionCheck();
        return {
          status: 'session-pending',
        };
      }
      clearSessionState('email-confirmation-required');
      return {
        status: 'confirmation-required',
      };
    },
    [beginSessionCheck, clearSessionState]
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearSessionState('signed-out');
    window.location.href = '/login';
  }, [clearSessionState]);

  return {
    user,
    profile,
    authStoreTruth,
    authTruth,
    initAuth,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loadProfile,
  };
}
