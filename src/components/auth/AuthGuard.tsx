import { useAuth } from '@/hooks/useAuth';
import { SignInBanner } from './SignInBanner';

interface AuthGuardProps {
  children: React.ReactNode;
  feature?: string;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, feature, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();

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
        <SignInBanner
          feature={feature || "this feature"}
          detail="Sign in with your jubit.ai account to continue"
        />
      </div>
    );
  }

  return <>{children}</>;
}
