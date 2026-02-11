import { useState, useEffect, useCallback } from 'react';
import type { User, Session, Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  enabled: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: !supabase ? false : true,
    enabled: !!supabase,
  });

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null);
      setState({ user: session?.user ?? null, session, loading: false, enabled: true });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token ?? null);
      setState({ user: session?.user ?? null, session, loading: false, enabled: true });
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (provider: Provider) => {
    if (!supabase) return;
    // Store current path so we can return after OAuth
    sessionStorage.setItem('auth_return_path', window.location.pathname);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return { ...state, signIn, signOut };
}

// Cache the token from the last auth state change for synchronous access
let _cachedToken: string | null = null;

export function setAuthToken(token: string | null) {
  _cachedToken = token;
}

export function getAuthToken(): string | null {
  if (_cachedToken) return _cachedToken;
  // Fallback: read from localStorage
  const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
  if (!storageKey) return null;
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) || '');
    return data?.access_token || null;
  } catch {
    return null;
  }
}
