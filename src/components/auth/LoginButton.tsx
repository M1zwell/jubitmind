import { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Provider } from '@supabase/supabase-js';

const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: 'google', label: 'Google', color: 'text-red-400' },
  { id: 'apple', label: 'Apple', color: 'text-gray-300' },
];

export function LoginButton() {
  const { user, loading, signIn, signOut, enabled } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Don't show login button when Supabase is not configured
  if (!enabled || loading) return null;

  if (user) {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="" className="w-4 h-4 rounded-full" />
          ) : (
            <User className="w-3.5 h-3.5" />
          )}
          <span className="max-w-[120px] truncate">{user.email || 'User'}</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg z-50 min-w-[140px]">
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        Sign in
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg z-50 min-w-[160px]">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => { signIn(p.id); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            >
              <span className={`font-medium ${p.color}`}>{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
