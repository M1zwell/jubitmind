/**
 * JubitEmbed - Iframe Embed Component
 *
 * Embeds jubit.ai's ChatAB (multi-model chat) or ChatLab (AI debates)
 * with SSO auth sync and PostMessage communication.
 *
 * Adapted from linebase-ainews-pack/JubitEmbed/JubitEmbed.tsx
 */

import { useMemo, useCallback, useEffect, useState } from 'react';
import { Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { useJubitBridge } from './useJubitBridge';
import { useJubitAuth } from './useJubitAuth';
import { JUBIT_BASE } from '@/lib/config';
import type { JubitModule, JubitEmbedCallbacks } from './types';

interface JubitEmbedProps extends JubitEmbedCallbacks {
  module: JubitModule;
  /** Room/conversation ID to load an existing archive */
  roomId?: string;
  /** Override the jubit.ai path (e.g. 'theater/archived' for chat type) */
  pathOverride?: string;
  height?: string | number;
  initialMessage?: string;
  topic?: string;
  debug?: boolean;
}

export function JubitEmbed({
  module,
  roomId,
  pathOverride,
  height = '100%',
  initialMessage,
  topic,
  debug = false,
  onReady,
  onAuthRequired,
  onAuthSuccess,
  onAuthSignedOut,
  onMessageSent,
  onResponseComplete,
  onDebateStarted,
  onDebateTurn,
  onDebateEnded,
  onError,
}: JubitEmbedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const {
    iframeRef,
    isReady,
    isLoading,
    error,
    sendCommand,
    reset,
  } = useJubitBridge({
    debug,
    onReady,
    onAuthRequired: () => {
      auth.handleAuthRequired();
      onAuthRequired?.();
    },
    onAuthSuccess,
    onAuthSignedOut,
    onMessageSent,
    onResponseComplete,
    onDebateStarted,
    onDebateTurn,
    onDebateEnded,
    onError,
  });

  const auth = useJubitAuth({ sendCommand, isReady, debug });

  // Build iframe URL
  const iframeSrc = useMemo(() => {
    const params = new URLSearchParams({
      embed: 'true',
      origin: window.location.origin,
      theme: 'dark',
      sidebar: 'false',
      interactive: 'true',
    });

    if (initialMessage && module === 'chatab') {
      params.set('message', initialMessage);
      params.set('autoSend', 'true');
    }

    if (topic && module === 'chatlab') {
      params.set('topic', topic);
    }

    // Use www.jubit.ai to avoid redirect
    const base = JUBIT_BASE.replace('https://jubit.ai', 'https://www.jubit.ai');

    // Build path: pathOverride takes priority, then module/roomId, then just module
    let path: string;
    if (pathOverride) {
      path = roomId ? `${pathOverride}/${roomId}` : pathOverride;
    } else {
      path = roomId ? `${module}/${roomId}` : module;
    }

    return `${base}/${path}?${params.toString()}`;
  }, [module, roomId, pathOverride, initialMessage, topic]);

  // Send initial configuration when ready
  useEffect(() => {
    if (!isReady) return;

    if (topic && module === 'chatlab') {
      sendCommand({ command: 'startDebate', topic });
    }

    if (initialMessage && module === 'chatab') {
      setTimeout(() => {
        sendCommand({ command: 'sendMessage', content: initialMessage });
      }, 500);
    }
  }, [isReady, topic, module, initialMessage, sendCommand]);

  const handleRetry = useCallback(() => {
    setIframeLoaded(false);
    reset();
    if (iframeRef.current) {
      iframeRef.current.src = iframeSrc;
    }
  }, [reset, iframeSrc, iframeRef]);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="relative w-full overflow-hidden" style={{ height: heightStyle }}>
      {/* Loading State */}
      {isLoading && !iframeLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
              <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                {roomId ? 'Loading Archive' : `Loading ${module === 'chatab' ? 'Multi-Model Chat' : 'AI Debate Arena'}`}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                Powered by jubit.ai
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-primary)]">
          <div className="text-center p-6 max-w-sm">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              Failed to Load
            </h3>
            <p className="text-xs text-[var(--color-text-muted)] mb-4">
              {error.message || 'Unable to connect to Jubit AI'}
            </p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Debug indicator */}
      {isReady && debug && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 text-[10px] font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
          Connected{auth.isAuthenticated ? ' + Auth' : ''}
        </div>
      )}

      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        allow="clipboard-write; clipboard-read"
        title={`Jubit AI ${module === 'chatab' ? 'Chat' : 'Debate'}`}
        loading="lazy"
        onLoad={() => setIframeLoaded(true)}
        style={{
          opacity: (isReady || iframeLoaded) && !error ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
    </div>
  );
}

// Convenience wrappers

type EmbedProps = Omit<JubitEmbedProps, 'module'>;

export function JubitChatEmbed(props: EmbedProps) {
  return <JubitEmbed {...props} module="chatab" />;
}

export function JubitDebateEmbed(props: EmbedProps) {
  return <JubitEmbed {...props} module="chatlab" />;
}
