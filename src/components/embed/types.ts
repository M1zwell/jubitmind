/**
 * Jubit.ai Embed Types
 *
 * PostMessage communication between JubitMind (parent) and jubit.ai (iframe).
 * Adapted from linebase-ainews-pack/JubitEmbed/types.ts
 */

// Outbound events (jubit.ai → JubitMind)

export type JubitEventType =
  | 'ready'
  | 'auth_required'
  | 'auth_success'
  | 'auth_signed_out'
  | 'chat_started'
  | 'message_sent'
  | 'response_complete'
  | 'debate_started'
  | 'debate_turn'
  | 'debate_ended'
  | 'error';

export interface JubitEventBase {
  source: 'jubit-ai';
  type: JubitEventType;
  timestamp: number;
}

export interface ReadyEvent extends JubitEventBase {
  type: 'ready';
  version: string;
}

export interface AuthRequiredEvent extends JubitEventBase {
  type: 'auth_required';
}

export interface AuthSuccessEvent extends JubitEventBase {
  type: 'auth_success';
  userId: string;
  email?: string;
}

export interface AuthSignedOutEvent extends JubitEventBase {
  type: 'auth_signed_out';
}

export interface ChatStartedEvent extends JubitEventBase {
  type: 'chat_started';
  conversationId: string;
  models: string[];
}

export interface MessageSentEvent extends JubitEventBase {
  type: 'message_sent';
  content: string;
}

export interface ResponseCompleteEvent extends JubitEventBase {
  type: 'response_complete';
  modelId: string;
  modelDisplayName: string;
  tokenCount?: number;
  durationMs?: number;
}

export interface DebateStartedEvent extends JubitEventBase {
  type: 'debate_started';
  debateId: string;
  topic: string;
  participants: string[];
}

export interface DebateTurnEvent extends JubitEventBase {
  type: 'debate_turn';
  speaker: string;
  content: string;
  turnNumber: number;
}

export interface DebateEndedEvent extends JubitEventBase {
  type: 'debate_ended';
  summary?: string;
  totalTurns: number;
}

export interface ErrorEvent extends JubitEventBase {
  type: 'error';
  code: string;
  message: string;
}

export type JubitEvent =
  | ReadyEvent
  | AuthRequiredEvent
  | AuthSuccessEvent
  | AuthSignedOutEvent
  | ChatStartedEvent
  | MessageSentEvent
  | ResponseCompleteEvent
  | DebateStartedEvent
  | DebateTurnEvent
  | DebateEndedEvent
  | ErrorEvent;

// Inbound commands (JubitMind → jubit.ai)

export interface SsoRedirectCommand {
  command: 'sso_redirect';
  url: string;
  popup?: boolean;
}

export interface ClearAuthCommand {
  command: 'clearAuth';
}

export interface SendMessageCommand {
  command: 'sendMessage';
  content: string;
}

export interface StartDebateCommand {
  command: 'startDebate';
  topic: string;
  models?: string[];
}

export interface SetThemeCommand {
  command: 'setTheme';
  theme: 'light' | 'dark' | 'system';
}

export interface PingCommand {
  command: 'ping';
}

export type JubitCommand =
  | SsoRedirectCommand
  | ClearAuthCommand
  | SendMessageCommand
  | StartDebateCommand
  | SetThemeCommand
  | PingCommand;

// Component props

export type JubitModule = 'chatab' | 'chatlab';

export interface JubitEmbedCallbacks {
  onReady?: (version: string) => void;
  onAuthRequired?: () => void;
  onAuthSuccess?: (userId: string, email?: string) => void;
  onAuthSignedOut?: () => void;
  onMessageSent?: (content: string) => void;
  onResponseComplete?: (modelId: string, modelDisplayName: string, tokenCount?: number, durationMs?: number) => void;
  onDebateStarted?: (debateId: string, topic: string, participants: string[]) => void;
  onDebateTurn?: (speaker: string, content: string, turnNumber: number) => void;
  onDebateEnded?: (summary?: string, totalTurns?: number) => void;
  onError?: (code: string, message: string) => void;
}
