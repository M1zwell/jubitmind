import { useState, useEffect, useCallback, useRef } from 'react';

interface SSEMessage {
  type: string;
  subtype?: string;
  content?: string;
  result?: string;
  session_id?: string;
  usage?: Record<string, unknown>;
  [key: string]: unknown;
}

type SSEStatus = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

interface ProviderOptions {
  providerId: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export function useSSE() {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [status, setStatus] = useState<SSEStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const start = useCallback((prompt: string, claudeModel?: string, providerOpts?: ProviderOptions) => {
    // Close any existing connection
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    setMessages([]);
    setStatus('connecting');

    let url: string;

    if (providerOpts) {
      // Provider streaming mode
      const params = new URLSearchParams({
        prompt,
        providerId: providerOpts.providerId,
        model: providerOpts.model,
      });
      if (providerOpts.systemPrompt) params.set('systemPrompt', providerOpts.systemPrompt);
      if (providerOpts.temperature !== undefined) params.set('temperature', String(providerOpts.temperature));
      if (providerOpts.maxTokens) params.set('maxTokens', String(providerOpts.maxTokens));
      url = `/api/providers/chat/stream?${params}`;
    } else {
      // Claude CLI streaming mode
      const params = new URLSearchParams({ prompt });
      if (claudeModel) params.set('model', claudeModel);
      url = `/api/cli/stream?${params}`;
    }

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => setStatus('streaming');

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEMessage;
        setMessages((prev) => [...prev, data]);
      } catch {
        setMessages((prev) => [...prev, { type: 'text', content: event.data }]);
      }
    };

    source.addEventListener('done', (event) => {
      // Extract sessionId from done event data
      try {
        const data = JSON.parse((event as MessageEvent).data);
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
      } catch { /* empty done event */ }
      setStatus('done');
      source.close();
      sourceRef.current = null;
    });

    source.onerror = () => {
      setStatus((prev) => (prev === 'streaming' ? 'done' : 'error'));
      source.close();
      sourceRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
    setStatus('idle');
    // Cancel both CLI and provider processes
    fetch('/api/cli/cancel', { method: 'POST' }).catch(() => {});
    fetch('/api/providers/chat/cancel', { method: 'POST' }).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    stop();
    setMessages([]);
    setStatus('idle');
    setSessionId(null);
  }, [stop]);

  useEffect(() => {
    return () => {
      if (sourceRef.current) {
        sourceRef.current.close();
      }
    };
  }, []);

  return { messages, status, sessionId, start, stop, reset };
}
