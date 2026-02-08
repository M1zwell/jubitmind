import { useHealth } from '@/hooks/useClaudeApi';
import { Circle } from 'lucide-react';
import { LoginButton } from '@/components/auth/LoginButton';

export function Header() {
  const { data, isLoading } = useHealth();

  return (
    <header className="flex-none h-10 px-4 border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">JubitMind Dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Circle
            className={`w-2 h-2 ${isLoading ? 'text-yellow-500 fill-yellow-500' : data ? 'text-emerald-500 fill-emerald-500' : 'text-red-500 fill-red-500'}`}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            {isLoading ? 'Connecting...' : data ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {data && (
          <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">
            {(data as Record<string, string>).cliVersion || 'CLI'}
          </span>
        )}
        <LoginButton />
      </div>
    </header>
  );
}
