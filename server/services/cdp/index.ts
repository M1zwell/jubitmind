// Core service
export { cdpService } from './cdp-service.js';

// Types
export type {
  CDPConnectionConfig,
  CDPTabInfo,
  CDPConnectionStatus,
  CDPCookieInfo,
  CDPStorageData,
  CDPAuthStatus,
} from './types.js';

// Extractor types and registry
export type {
  EvalFn,
  ExtractedMessage,
  ExtractedConversation,
  DOMExtractor,
} from './extractors/index.js';
export { getExtractor, listExtractors } from './extractors/index.js';
