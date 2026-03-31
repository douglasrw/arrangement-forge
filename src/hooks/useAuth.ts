// useAuth.ts — Auth initialization and actions, connecting Supabase Auth to Zustand.

import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/profile';
import type { SignedOutReason } from '@/store/auth-store';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

export function useAuth() {
  const authStore = useAuthStore();

  const clearSessionState = useCallback((reason: SignedOutReason) => {
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

  const hydrateSession = useCallback(async (user: User) => {
    try {
      const profile = await loadProfile(user.id);

      if (!profile) {
        return {
          ok: false as const,
          reason: 'missing-profile' as const,
        };
      }

      useAuthStore.getState().completeAuthenticatedSession({ user, profile });
      useUiStore.getState().setChordDisplayMode(profile.chordDisplayMode);

      return {
        ok: true as const,
      };
    } catch {
      return {
        ok: false as const,
        reason: 'profile-load-failed' as const,
      };
    }
  }, [loadProfile]);

  const initAuth = useCallback(() => {
    useAuthStore.getState().beginSessionCheck();
    let isActive = true;

    void supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!isActive) return;

        if (session?.user) {
          const hydrationResult = await hydrateSession(session.user);
          if (isActive && !hydrationResult.ok) {
            clearSessionState(hydrationResult.reason);
          }
        } else {
          clearSessionState('no-session');
        }
      })
      .catch(() => {
        if (isActive) {
          clearSessionState('session-lookup-failed');
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().beginSessionCheck();
        void hydrateSession(session.user).then((hydrationResult) => {
          if (!hydrationResult.ok) {
            clearSessionState(hydrationResult.reason);
          }
        });
      } else if (event === 'SIGNED_OUT') {
        clearSessionState('signed-out');
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [clearSessionState, hydrateSession, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      useAuthStore.getState().beginSessionCheck();
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.session?.user) {
      useAuthStore.getState().beginSessionCheck();
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearSessionState('signed-out');
    window.location.href = '/login';
  }, [clearSessionState]);

  return {
    ...authStore,
    initAuth,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loadProfile,
  };
}
