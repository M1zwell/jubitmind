declare module 'chrome-remote-interface' {
  interface CDPOptions {
    host?: string;
    port?: number;
    target?: string;
  }

  interface RuntimeEvaluateResult {
    result: {
      type: string;
      value: unknown;
    };
    exceptionDetails?: {
      text?: string;
      exception?: { description?: string };
    };
  }

  interface CDPClient {
    Runtime: {
      enable(): Promise<void>;
      evaluate(params: {
        expression: string;
        returnByValue?: boolean;
        awaitPromise?: boolean;
      }): Promise<RuntimeEvaluateResult>;
    };
    Network: {
      enable(params: Record<string, unknown>): Promise<void>;
      getCookies(params: { urls: string[] }): Promise<{
        cookies: Array<{
          name: string;
          value: string;
          domain: string;
          path: string;
          expires: number;
          httpOnly: boolean;
          secure: boolean;
        }>;
      }>;
    };
    close(): Promise<void>;
  }

  function CDP(options?: CDPOptions): Promise<CDPClient>;

  namespace CDP {
    function Version(options?: { host?: string; port?: number }): Promise<Record<string, unknown>>;
    function List(options?: { host?: string; port?: number }): Promise<
      Array<{
        id: string;
        title: string;
        url: string;
        type: string;
        webSocketDebuggerUrl?: string;
      }>
    >;
  }

  export = CDP;
}
