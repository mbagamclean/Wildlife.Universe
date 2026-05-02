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

    // Safety net: if INITIAL_SESSION never fires (library internal lock timeout
    // or initializePromise rejection), loading would stay true forever. This
    // ensures the app always unblocks within 6 s.
    const safetyTimer = setTimeout(() => setLoading(false), 6000);

    // onAuthStateChange fires INITIAL_SESSION immediately on subscription,
    // so getSession() is redundant. Calling both concurrently causes them to
    // compete for the same IndexedDB auth lock, which leaves loading=true
    // forever if one steals the lock from the other.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null);
          return;
        }
        const profile = await fetchProfile(session.user);
        // Only overwrite user if profile loaded successfully; a transient DB
        // error should not clobber a user who just successfully signed in.
        if (profile !== null) setUser(profile);
      } catch (err) {
        console.error('[AuthContext] onAuthStateChange error:', err);
      } finally {
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
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
