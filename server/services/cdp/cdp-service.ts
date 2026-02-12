import CDP from 'chrome-remote-interface';
import type {
  CDPConnectionConfig,
  CDPConnectionStatus,
  CDPTabInfo,
  CDPCookieInfo,
  CDPAuthStatus,
} from './types.js';
import {
  getExtractor,
  type ExtractedConversation,
  type ExtractedMessage,
} from './extractors/index.js';

// --- AI tool URL pattern mapping ---

const AI_TOOL_PATTERNS: Array<{ pattern: RegExp; tool: string }> = [
  { pattern: /chatgpt\.com|chat\.openai\.com/, tool: 'chatgpt' },
  { pattern: /claude\.ai/, tool: 'claude-web' },
  { pattern: /gemini\.google\.com/, tool: 'gemini' },
  { pattern: /perplexity\.ai/, tool: 'perplexity' },
  { pattern: /chat\.deepseek\.com/, tool: 'deepseek' },
  { pattern: /chat\.qwen\.ai|tongyi\.aliyun\.com/, tool: 'qwen' },
  { pattern: /kimi\.moonshot\.cn|kimi\.ai/, tool: 'kimi' },
  { pattern: /jubit\.ai/, tool: 'jubit' },
  { pattern: /cursor\.com/, tool: 'cursor-web' },
  { pattern: /kilocode\.ai/, tool: 'kilo-web' },
  { pattern: /antigravity\.dev|antigravity\.ai/, tool: 'antigravity-web' },
];

const ALLOWED_HOSTS = new Set(['127.0.0.1', 'localhost']);
const DEFAULT_CONFIG: CDPConnectionConfig = { host: '127.0.0.1', port: 9222 };
const HEALTH_CHECK_INTERVAL_MS = 30_000;

/**
 * Detect which AI tool a URL corresponds to.
 * Returns undefined if no match found.
 */
function detectTool(url: string): string | undefined {
  for (const { pattern, tool } of AI_TOOL_PATTERNS) {
    if (pattern.test(url)) return tool;
  }
  return undefined;
}

/**
 * Validate that the host is allowed (localhost only for security).
 */
function validateHost(host: string): void {
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      `Security: CDP connections are restricted to localhost. Received host: "${host}"`
    );
  }
}

// --- Singleton CDP Service ---

class CDPService {
  private config: CDPConnectionConfig = { ...DEFAULT_CONFIG };
  private connected = false;
  private chromeVersion: string | undefined;
  private healthInterval: ReturnType<typeof setInterval> | undefined;
  private lastChecked: string = new Date().toISOString();
  private lastError: string | undefined;

  /**
   * Connect to a Chrome instance via CDP.
   * Validates the host, fetches Chrome version info, and starts health checks.
   */
  async connect(config?: Partial<CDPConnectionConfig>): Promise<CDPConnectionStatus> {
    const host = config?.host ?? this.config.host;
    const port = config?.port ?? this.config.port;

    validateHost(host);

    this.config = { host, port };

    try {
      const version = await CDP.Version({ host, port });
      this.chromeVersion = (version.Browser as string | undefined)
        ?? (version['Protocol-Version'] as string | undefined)
        ?? 'unknown';
      this.connected = true;
      this.lastError = undefined;
      this.lastChecked = new Date().toISOString();

      // Start periodic health checks
      this.stopHealthCheck();
      this.healthInterval = setInterval(() => {
        void this.healthCheck();
      }, HEALTH_CHECK_INTERVAL_MS);

      return this.getStatus();
    } catch (err) {
      this.connected = false;
      this.lastError = (err as Error).message;
      this.lastChecked = new Date().toISOString();
      return this.getStatus();
    }
  }

  /**
   * Disconnect from Chrome. Stops health checks and marks as disconnected.
   */
  disconnect(): void {
    this.stopHealthCheck();
    this.connected = false;
    this.chromeVersion = undefined;
    this.lastError = undefined;
    this.lastChecked = new Date().toISOString();
  }

  /**
   * Get current connection status.
   */
  getStatus(): CDPConnectionStatus {
    return {
      connected: this.connected,
      host: this.config.host,
      port: this.config.port,
      chromeVersion: this.chromeVersion,
      lastChecked: this.lastChecked,
      error: this.lastError,
    };
  }

  /**
   * List all open page/tab targets from Chrome.
   * Each tab includes AI tool detection based on URL.
   */
  async listTabs(): Promise<CDPTabInfo[]> {
    this.ensureConnected();

    const targets = await CDP.List({
      host: this.config.host,
      port: this.config.port,
    });

    return targets
      .filter((t) => t.type === 'page')
      .map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
        type: t.type,
        webSocketDebuggerUrl: t.webSocketDebuggerUrl ?? '',
        detectedTool: detectTool(t.url),
      }));
  }

  /**
   * Get only the tabs that match known AI tool URL patterns.
   */
  async getAIToolTabs(): Promise<CDPTabInfo[]> {
    const tabs = await this.listTabs();
    return tabs.filter((t) => t.detectedTool !== undefined);
  }

  /**
   * Evaluate a JavaScript expression in a specific tab.
   * Creates a temporary CDP client, runs Runtime.evaluate, then closes.
   */
  async evaluateOnTab(tabId: string, expression: string): Promise<unknown> {
    this.ensureConnected();

    const client = await CDP({
      host: this.config.host,
      port: this.config.port,
      target: tabId,
    });

    try {
      const { Runtime } = client;
      await Runtime.enable();
      const result = await Runtime.evaluate({
        expression,
        returnByValue: true,
        awaitPromise: true,
      });

      if (result.exceptionDetails) {
        throw new Error(
          `Runtime evaluation error: ${result.exceptionDetails.text ?? 'Unknown error'}`
        );
      }

      return result.result.value;
    } finally {
      await client.close();
    }
  }

  /**
   * Get cookies for a specific domain from a tab.
   */
  async getCookiesForDomain(tabId: string, domain: string): Promise<CDPCookieInfo[]> {
    this.ensureConnected();

    const client = await CDP({
      host: this.config.host,
      port: this.config.port,
      target: tabId,
    });

    try {
      const { Network } = client;
      await Network.enable({});
      const { cookies } = await Network.getCookies({ urls: [`https://${domain}`] });

      return cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
      }));
    } finally {
      await client.close();
    }
  }

  /**
   * Get all localStorage key-value pairs from a tab.
   */
  async getLocalStorage(tabId: string): Promise<Record<string, string>> {
    const result = await this.evaluateOnTab(
      tabId,
      `(() => {
        try {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) data[key] = localStorage.getItem(key) || '';
          }
          return data;
        } catch (e) {
          return {};
        }
      })()`
    );
    return (result as Record<string, string>) || {};
  }

  /**
   * Get all sessionStorage key-value pairs from a tab.
   */
  async getSessionStorage(tabId: string): Promise<Record<string, string>> {
    const result = await this.evaluateOnTab(
      tabId,
      `(() => {
        try {
          const data = {};
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key) data[key] = sessionStorage.getItem(key) || '';
          }
          return data;
        } catch (e) {
          return {};
        }
      })()`
    );
    return (result as Record<string, string>) || {};
  }

  /**
   * Detect authentication status for a specific AI tool on a tab.
   * Delegates to the tool-specific extractor's detectAuthStatus method.
   * Falls back to generic cookie/localStorage checks if no extractor exists.
   */
  async getAuthStatus(tabId: string, tool: string): Promise<CDPAuthStatus> {
    this.ensureConnected();

    const extractor = getExtractor(tool);

    if (extractor) {
      const evalFn = (expression: string) => this.evaluateOnTab(tabId, expression);
      const { signedIn, indicators } = await extractor.detectAuthStatus(evalFn);
      return { tool, signedIn, indicators };
    }

    // Generic fallback: check for common auth indicators
    const result = await this.evaluateOnTab(
      tabId,
      `(() => {
        try {
          const indicators = [];
          const avatar = document.querySelector('[class*="avatar"], [class*="Avatar"]');
          if (avatar) indicators.push('avatar-present');
          const hasCookies = document.cookie.includes('session')
            || document.cookie.includes('token');
          if (hasCookies) indicators.push('session-cookie');
          const hasToken = localStorage.getItem('token')
            || localStorage.getItem('auth');
          if (hasToken) indicators.push('local-storage-token');
          return { signedIn: indicators.length >= 2, indicators };
        } catch (e) {
          return { signedIn: false, indicators: [] };
        }
      })()`
    );

    const authResult = result as { signedIn: boolean; indicators: string[] } | null;
    return {
      tool,
      signedIn: authResult?.signedIn ?? false,
      indicators: authResult?.indicators ?? [],
    };
  }

  /**
   * Extract conversation messages from a tab using the tool-specific extractor.
   * Returns an ExtractedConversation with messages, or empty if no extractor matches.
   */
  async extractConversations(tabId: string, tool: string): Promise<ExtractedConversation> {
    this.ensureConnected();

    const extractor = getExtractor(tool);
    const evalFn = (expression: string) => this.evaluateOnTab(tabId, expression);

    let messages: ExtractedMessage[] = [];
    if (extractor) {
      messages = await extractor.extractConversationMessages(evalFn);
    }

    // Get tab info for URL and title
    const tabUrl = await this.evaluateOnTab(tabId, 'window.location.href') as string;
    const tabTitle = await this.evaluateOnTab(tabId, 'document.title') as string;

    return {
      conversationId: `${tool}-${tabId}-${Date.now()}`,
      title: tabTitle || 'Untitled',
      messages,
      url: tabUrl || '',
      extractedAt: new Date().toISOString(),
    };
  }

  // --- Private helpers ---

  /**
   * Verify connection is active before making CDP calls.
   */
  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('Not connected to Chrome via CDP. Call connect() first.');
    }
  }

  /**
   * Periodic health check to verify Chrome is still reachable.
   */
  private async healthCheck(): Promise<void> {
    try {
      await CDP.Version({
        host: this.config.host,
        port: this.config.port,
      });
      this.connected = true;
      this.lastError = undefined;
    } catch (err) {
      this.connected = false;
      this.lastError = (err as Error).message;
    }
    this.lastChecked = new Date().toISOString();
  }

  /**
   * Stop the periodic health check interval.
   */
  private stopHealthCheck(): void {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = undefined;
    }
  }
}

// Export singleton instance
export const cdpService = new CDPService();
