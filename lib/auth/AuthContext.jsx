'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signIn, signInWithOAuth, signOut, signUp, updateProfile } from './session';

const AuthContext = createContext(null);

async function fetchProfile(supabaseUser) {
  if (!supabaseUser) return null;
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
  if (!data) return null;
  const { first_name, last_name, avatar_id, created_at, password_reset_required, ...rest } = data;
  return {
    ...rest,
    firstName: first_name,
    lastName: last_name,
    avatarId: avatar_id,
    createdAt: created_at,
    passwordResetRequired: password_reset_required ?? false,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: sbUser } } = await supabase.auth.getUser();
    setUser(await fetchProfile(sbUser));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(await fetchProfile(session?.user ?? null));
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(await fetchProfile(session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    refresh,
    signIn: async (email, password) => {
      const u = await signIn(email, password);
      setUser(u);
      return u;
    },
    signInWithOAuth: async (provider) => {
      const u = await signInWithOAuth(provider);
      setUser(u);
      return u;
    },
    signUp: async (payload) => {
      const u = await signUp(payload);
      setUser(u);
      return u;
    },
    signOut: async () => {
      await signOut();
      setUser(null);
    },
    updateProfile: async (id, patch) => {
      const u = await updateProfile(id, patch);
      setUser(u);
      return u;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
