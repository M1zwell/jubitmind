export interface CDPConnectionConfig {
  host: string;    // default '127.0.0.1'
  port: number;    // default 9222
}

export interface CDPTabInfo {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl: string;
  detectedTool?: string;
}

export interface CDPConnectionStatus {
  connected: boolean;
  host: string;
  port: number;
  chromeVersion?: string;
  tabCount?: number;
  aiToolTabs?: number;
  lastChecked: string;
  error?: string;
}

export interface CDPCookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
}

export interface CDPStorageData {
  cookies: CDPCookieInfo[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

export interface CDPAuthStatus {
  tool: string;
  signedIn: boolean;
  username?: string;
  email?: string;
  indicators: string[];
}
