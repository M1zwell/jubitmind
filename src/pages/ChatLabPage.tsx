import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Users, RefreshCw, ArrowLeft } from 'lucide-react';
import { SignInBanner } from '@/components/auth/SignInBanner';
import { JubitDebateEmbed } from '@/components/embed/JubitEmbed';

export function ChatLabPage() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room') || undefined;
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
          <Users className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">ChatLab</h1>
            <p className="text-[10px] text-[var(--color-text-muted)]">
              {roomId ? `Loading archive ${roomId.slice(0, 8)}...` : 'AI debate arena'}
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
        feature="embedded debate"
        detail="Authentication syncs automatically to the embedded debate session"
      />

      {/* Embedded ChatLab */}
      <div className="flex-1 rounded-lg overflow-hidden border border-[var(--color-border)]">
        <JubitDebateEmbed
          key={`chatlab-${sessionKey}-${roomId || 'new'}`}
          roomId={roomId}
          height="100%"
          onReady={(version) => console.log('[ChatLab] Ready:', version, roomId ? `room=${roomId}` : 'new session')}
          onDebateStarted={(id, topic, participants) => {
            console.log('[ChatLab] Started:', topic, participants);
          }}
          onDebateTurn={(speaker, _content, turn) => {
            console.log('[ChatLab] Turn', turn, ':', speaker);
          }}
          onDebateEnded={(summary, totalTurns) => {
            console.log('[ChatLab] Ended:', totalTurns, 'turns', summary?.slice(0, 80));
          }}
          onError={(code, message) => console.error('[ChatLab] Error:', code, message)}
        />
      </div>
    </div>
  );
}
