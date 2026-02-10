declare module 'pg' {
  export class Client {
    constructor(config: { connectionString: string });
    connect(): Promise<void>;
    query(sql: string): Promise<{ rows: unknown[] }>;
    end(): Promise<void>;
  }
  export default { Client };
}
