/**
 * useJubitBridge - PostMessage Communication Hook
 *
 * Manages bidirectional communication between JubitMind and jubit.ai embeds.
 * Adapted from linebase-ainews-pack/JubitEmbed/useJubitBridge.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  JubitEvent,
  JubitCommand,
  JubitEmbedCallbacks,
} from './types';

const JUBIT_ORIGINS = [
  'https://www.jubit.ai',
  'https://jubit.ai',
  'http://localhost:8086',
  'http://localhost:8080',
];

interface UseJubitBridgeOptions extends JubitEmbedCallbacks {
  debug?: boolean;
}

interface UseJubitBridgeReturn {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  isReady: boolean;
  isLoading: boolean;
  error: Error | null;
  sendCommand: (command: JubitCommand) => void;
  reset: () => void;
}

export function useJubitBridge(options: UseJubitBridgeOptions = {}): UseJubitBridgeReturn {
  const {
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
  } = options;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const log = useCallback((...args: unknown[]) => {
    if (debug) console.log('[JubitBridge]', ...args);
  }, [debug]);

  const sendCommand = useCallback((command: JubitCommand) => {
    if (!iframeRef.current?.contentWindow) {
      log('Cannot send command - iframe not ready');
      return;
    }
    log('Sending command:', command);
    iframeRef.current.contentWindow.postMessage(command, 'https://www.jubit.ai');
  }, [log]);

  const handleMessage = useCallback((event: MessageEvent) => {
    if (!JUBIT_ORIGINS.includes(event.origin)) return;
    if (event.data?.source !== 'jubit-ai') return;

    const e = event.data as JubitEvent;
    log('Received event:', e.type);

    switch (e.type) {
      case 'ready':
        setIsReady(true);
        setIsLoading(false);
        onReady?.(e.version);
        break;
      case 'auth_required':
        onAuthRequired?.();
        break;
      case 'auth_success':
        onAuthSuccess?.(e.userId, e.email);
        break;
      case 'auth_signed_out':
        onAuthSignedOut?.();
        break;
      case 'message_sent':
        onMessageSent?.(e.content);
        break;
      case 'response_complete':
        onResponseComplete?.(e.modelId, e.modelDisplayName, e.tokenCount, e.durationMs);
        break;
      case 'debate_started':
        onDebateStarted?.(e.debateId, e.topic, e.participants);
        break;
      case 'debate_turn':
        onDebateTurn?.(e.speaker, e.content, e.turnNumber);
        break;
      case 'debate_ended':
        onDebateEnded?.(e.summary, e.totalTurns);
        break;
      case 'error':
        setError(new Error(e.message));
        onError?.(e.code, e.message);
        break;
    }
  }, [log, onReady, onAuthRequired, onAuthSuccess, onAuthSignedOut, onMessageSent, onResponseComplete, onDebateStarted, onDebateTurn, onDebateEnded, onError]);

  const handleLoad = useCallback(() => {
    log('Iframe loaded');
    setTimeout(() => sendCommand({ command: 'ping' }), 100);
    // Fallback: mark ready after 3s if no PostMessage received
    setTimeout(() => {
      setIsReady(prev => {
        if (!prev) {
          log('Fallback: marking as ready');
          setIsLoading(false);
          onReady?.('fallback');
          return true;
        }
        return prev;
      });
    }, 3000);
  }, [log, sendCommand, onReady]);

  const handleError = useCallback(() => {
    const err = new Error('Failed to load Jubit embed');
    setError(err);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleLoad);
      iframe.addEventListener('error', handleError);
    }
    return () => {
      window.removeEventListener('message', handleMessage);
      if (iframe) {
        iframe.removeEventListener('load', handleLoad);
        iframe.removeEventListener('error', handleError);
      }
    };
  }, [handleMessage, handleLoad, handleError]);

  const reset = useCallback(() => {
    setIsReady(false);
    setIsLoading(true);
    setError(null);
  }, []);

  return { iframeRef, isReady, isLoading, error, sendCommand, reset };
}
