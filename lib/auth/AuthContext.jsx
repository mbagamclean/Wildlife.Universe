'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signIn, signInWithOAuth, signOut, signUp, updateProfile } from './session';

const AuthContext = createContext(null);

async function fetchProfile(supabaseUser) {
  if (!supabaseUser) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
  if (error) {
    console.error('[AuthContext] fetchProfile error:', error.message);
    return null;
  }
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
    let mounted = true;
    let subscription = null;

    async function init() {
      // Step 1: Load initial session. getSession() reads from cookie storage
      // and only hits the network if the access token needs refreshing.
      // Doing this BEFORE subscribing means the two operations never compete
      // for the Web Locks API auth lock, which previously caused the lock to
      // be "stolen" and INITIAL_SESSION to never fire.
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const profile = await fetchProfile(session.user);
          if (mounted && profile !== null) setUser(profile);
        }
      } catch (err) {
        console.error('[AuthContext] getSession error:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }

      if (!mounted) return;

      // Step 2: Subscribe for future auth changes only. INITIAL_SESSION will
      // fire (the library always fires it) but we skip it since getSession()
      // already handled the initial state above.
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted || event === 'INITIAL_SESSION') return;
        if (event === 'SIGNED_OUT' || !session?.user) {
          if (mounted) setUser(null);
          return;
        }
        try {
          const profile = await fetchProfile(session.user);
          if (mounted && profile !== null) setUser(profile);
        } catch (err) {
          console.error('[AuthContext] onAuthStateChange error:', err);
        }
      });
      subscription = data.subscription;
    }

    init();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
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
