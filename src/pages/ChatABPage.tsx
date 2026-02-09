import { useState } from 'react';
import { MessageSquare, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LoginButton } from '@/components/auth/LoginButton';
import { JubitChatEmbed } from '@/components/embed/JubitEmbed';

export function ChatABPage() {
  const { user } = useAuth();
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">ChatAB</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">Multi-model comparison chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSessionKey(k => k + 1)}
            className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
            title="New session"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <LoginButton />
        </div>
      </div>

      {/* Sign-in prompt */}
      {!user && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-yellow-400">Sign in for full access</p>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
              Authentication syncs automatically to the embedded chat
            </p>
          </div>
          <LoginButton />
        </div>
      )}

      {/* Embedded ChatAB */}
      <div className="flex-1 rounded-lg overflow-hidden border border-[var(--color-border)]">
        <JubitChatEmbed
          key={`chatab-${sessionKey}`}
          height="100%"
          onReady={(version) => console.log('[ChatAB] Ready:', version)}
          onMessageSent={(content) => console.log('[ChatAB] Message:', content.slice(0, 80))}
          onResponseComplete={(modelId, name, tokens, duration) => {
            console.log('[ChatAB] Response:', name, tokens, 'tokens', duration, 'ms');
          }}
          onError={(code, message) => console.error('[ChatAB] Error:', code, message)}
        />
      </div>
    </div>
  );
}
