/**
 * useJubitAuth - SSO Authentication Bridge
 *
 * Syncs JubitMind's Supabase session to jubit.ai iframe via SSO token exchange.
 * JubitMind and jubit.ai share the same Supabase project, but different origins
 * require token passing via PostMessage + auth-token-exchange edge function.
 *
 * Adapted from linebase-ainews-pack/JubitEmbed/useJubitAuth.ts
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { JubitCommand } from './types';

interface UseJubitAuthOptions {
  sendCommand: (command: JubitCommand) => void;
  isReady: boolean;
  autoAuth?: boolean;
  debug?: boolean;
}

interface UseJubitAuthReturn {
  isAuthenticated: boolean;
  isAuthenticating: boolean;
  syncAuthToIframe: () => Promise<boolean>;
  handleAuthRequired: () => Promise<void>;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function useJubitAuth({
  sendCommand,
  isReady,
  autoAuth = true,
  debug = false,
}: UseJubitAuthOptions): UseJubitAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[JubitAuth]', ...args);
  }, [debug]);

  const createSSOToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        log('No session available for SSO token creation');
        return null;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-token-exchange`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          target_domain: 'jubit',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        log('Failed to create SSO token:', data.error);
        return null;
      }

      log('SSO token created');
      return data.redirect_url;
    } catch (err) {
      log('Error creating SSO token:', err);
      return null;
    }
  }, [log]);

  const syncAuthToIframe = useCallback(async (): Promise<boolean> => {
    log('Syncing auth to iframe via SSO token');
    setIsAuthenticating(true);

    try {
      const ssoUrl = await createSSOToken();
      if (!ssoUrl) {
        log('No SSO URL - user may not be authenticated');
        setIsAuthenticating(false);
        return false;
      }

      sendCommand({ command: 'sso_redirect', url: ssoUrl });
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return true;
    } catch (err) {
      log('SSO sync error:', err);
      setIsAuthenticating(false);
      return false;
    }
  }, [createSSOToken, sendCommand, log]);

  const handleAuthRequired = useCallback(async () => {
    log('Embed requested authentication');
    await syncAuthToIframe();
  }, [syncAuthToIframe, log]);

  // Auto-authenticate when iframe is ready
  useEffect(() => {
    if (!autoAuth || !isReady) return;

    const attemptAutoAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        log('Auto-authenticating embed via SSO');
        await syncAuthToIframe();
      }
    };

    attemptAutoAuth();
  }, [autoAuth, isReady, syncAuthToIframe, log]);

  // Listen for auth state changes (sign-in, token refresh, sign-out)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        log('Auth state changed:', event);

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && isReady) {
          await syncAuthToIframe();
        } else if (event === 'SIGNED_OUT') {
          sendCommand({ command: 'clearAuth' });
          setIsAuthenticated(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [isReady, sendCommand, syncAuthToIframe, log]);

  return { isAuthenticated, isAuthenticating, syncAuthToIframe, handleAuthRequired };
}
