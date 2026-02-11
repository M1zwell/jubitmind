import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { MessageSquare, RefreshCw, ArrowLeft } from 'lucide-react';
import { SignInBanner } from '@/components/auth/SignInBanner';
import { JubitChatEmbed } from '@/components/embed/JubitEmbed';

// Map product type → jubit.ai path for loading archived rooms
const TYPE_PATH_MAP: Record<string, string> = {
  chat: 'theater/archived',
  theater: 'theater/room',
};

export function ChatABPage() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room') || undefined;
  const archiveType = searchParams.get('type') || undefined;
  const pathOverride = archiveType ? TYPE_PATH_MAP[archiveType] : undefined;
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {roomId && (
            <Link
              to="/archived-discussions"
              className="p-1.5 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
              title="Back to Archives"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <MessageSquare className="w-5 h-5 text-teal-400" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">ChatAB</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {roomId ? `Loading archive ${roomId.slice(0, 8)}...` : 'Multi-model comparison chat'}
            </p>
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
        </div>
      </div>

      <SignInBanner
        feature="embedded chat"
        detail="Authentication syncs automatically to the embedded chat session"
      />

      {/* Embedded ChatAB */}
      <div className="flex-1 rounded-lg overflow-hidden border border-[var(--color-border)]">
        <JubitChatEmbed
          key={`chatab-${sessionKey}-${roomId || 'new'}`}
          roomId={roomId}
          pathOverride={pathOverride}
          height="100%"
          onReady={(version) => console.log('[ChatAB] Ready:', version, roomId ? `room=${roomId}` : 'new session')}
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
