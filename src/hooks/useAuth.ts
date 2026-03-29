// useAuth.ts — Auth initialization and actions, connecting Supabase Auth to Zustand.

import { useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { rowToProfile } from '@/lib/profile';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';

export function useAuth() {
  const authStore = useAuthStore();

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
    useAuthStore.getState().setProfile(profile);
    useUiStore.getState().setChordDisplayMode(profile.chordDisplayMode);
    return profile;
  }, []);

  const hydrateSession = useCallback(async (user: User) => {
    const profile = await loadProfile(user.id);

    if (!profile) {
      throw new Error('Authenticated session is missing a persisted profile.');
    }

    useAuthStore.getState().setUser(user);
  }, [loadProfile]);

  const initAuth = useCallback(() => {
    useAuthStore.getState().setLoading(true);
    let isActive = true;

    void supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!isActive) return;

        if (session?.user) {
          try {
            await hydrateSession(session.user);
          } catch {
            if (isActive) {
              useAuthStore.getState().signOut();
            }
          }
        } else {
          useAuthStore.getState().signOut();
        }
      })
      .catch(() => {
        if (isActive) {
          useAuthStore.getState().signOut();
        }
      })
      .finally(() => {
        if (isActive) {
          useAuthStore.getState().setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().setUser(session.user);
        void loadProfile(session.user.id).then((profile) => {
          if (!profile) {
            useAuthStore.getState().signOut();
          }
        }).catch(() => {
          useAuthStore.getState().signOut();
        });
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().signOut();
        useAuthStore.getState().setLoading(false);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [hydrateSession, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
    window.location.href = '/login';
  }, []);

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
