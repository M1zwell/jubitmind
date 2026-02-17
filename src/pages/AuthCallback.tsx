import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ALL_VALID_PATHS } from '@/lib/paths';

const DEFAULT_RETURN_PATH = '/';

function isValidReturnPath(path: string): boolean {
  if (ALL_VALID_PATHS.has(path)) return true;
  // Allow paths that are prefixes of valid paths (e.g. /history?q=x)
  for (const valid of ALL_VALID_PATHS) {
    if (path.startsWith(valid + '/') || path.startsWith(valid + '?')) return true;
  }
  return false;
}

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code && supabase) {
        // PKCE flow: exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[Auth] Code exchange failed:', error.message);
        }
      }

      // Redirect to stored return path or default, with validation
      const stored = sessionStorage.getItem('auth_return_path');
      sessionStorage.removeItem('auth_return_path');
      const returnPath = stored && isValidReturnPath(stored) ? stored : DEFAULT_RETURN_PATH;
      navigate(returnPath, { replace: true });
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-[var(--color-text-secondary)] text-sm">Signing in...</p>
    </div>
  );
}
