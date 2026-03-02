// useAuth.ts — Auth initialization and actions, connecting Supabase Auth to Zustand.

import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth-store';
import { useUiStore } from '@/store/ui-store';
import type { Profile } from '@/types';

function rowToProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string) ?? '',
    chordDisplayMode: (row.chord_display_mode as 'letter' | 'roman') ?? 'letter',
    defaultGenre: (row.default_genre as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function useAuth() {
  const authStore = useAuthStore();

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      const profile = rowToProfile(data as Record<string, unknown>);
      useAuthStore.getState().setProfile(profile);
      useUiStore.getState().setChordDisplayMode(profile.chordDisplayMode);
    }
  }, []);

  const initAuth = useCallback(() => {
    useAuthStore.getState().setLoading(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        useAuthStore.getState().setUser(session.user);
        loadProfile().finally(() => useAuthStore.getState().setLoading(false));
      } else {
        useAuthStore.getState().setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().setUser(session.user);
        loadProfile();
      } else if (event === 'SIGNED_OUT') {
        useAuthStore.getState().signOut();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

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
