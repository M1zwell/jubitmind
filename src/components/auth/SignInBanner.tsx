import { LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SignInBannerProps {
  feature: string;
  detail?: string;
}

export function SignInBanner({ feature, detail }: SignInBannerProps) {
  const { user, loading, signIn } = useAuth();

  if (loading || user) return null;

  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-yellow-400">
          Sign in to unlock {feature}
        </p>
        {detail && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{detail}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => signIn('google')}
          className="px-3 py-1.5 text-xs font-medium rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
        >
          Sign in
        </button>
        <button
          onClick={() => signIn('apple')}
          className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Apple
        </button>
      </div>
    </div>
  );
}
