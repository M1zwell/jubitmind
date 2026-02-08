import { useAuth } from '@/hooks/useAuth';
import { LogIn } from 'lucide-react';
import type { Provider } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LogIn className="w-8 h-8 text-[var(--color-text-muted)]" />
        <p className="text-sm text-[var(--color-text-muted)]">Sign in to access this feature</p>
        <div className="flex gap-2">
          {(['google', 'github'] as Provider[]).map((provider) => (
            <button
              key={provider}
              onClick={() => signIn(provider)}
              className="px-3 py-1.5 text-xs rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors capitalize"
            >
              {provider}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
