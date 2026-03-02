// auth-store.ts — Zustand store for Supabase authentication state.

import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';

interface AuthStore {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ isLoading: loading }),
  signOut: () => set({ user: null, profile: null, isAuthenticated: false }),
}));
