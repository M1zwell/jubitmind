import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        // PKCE flow: exchange code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[Auth] Code exchange failed:', error.message);
        }
      }

      // Redirect to stored return path or default
      const returnPath = sessionStorage.getItem('auth_return_path') || '/archived-discussions';
      sessionStorage.removeItem('auth_return_path');
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
