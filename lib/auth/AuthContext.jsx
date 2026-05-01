'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getCurrentUser, signIn, signInWithOAuth, signOut, signUp, updateProfile } from './session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const u = await getCurrentUser();
    setUser(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (!cancelled) {
        setUser(u);
        setLoading(false);
      }
    })();
    const onChange = () => refresh();
    window.addEventListener('wu:auth-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('wu:auth-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const value = {
    user,
    loading,
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
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
