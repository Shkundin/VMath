import { Inject, Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { APP_CONFIG, type AppConfig } from "../config/app-config";

export const DB_POOL = Symbol("DB_POOL");

export type Queryable = Pick<Pool, "query" | "connect" | "end">;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DB_POOL) private readonly pool: Queryable) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async maybeOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const result = await this.query<T>(text, params);
    return result.rows[0] ?? null;
  }

  async one<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<T> {
    const result = await this.query<T>(text, params);
    if (!result.rows[0]) {
      throw new Error(`Expected one row for query: ${text}`);
    }

    return result.rows[0];
  }

  async tx<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = (await this.pool.connect()) as PoolClient;
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.query("select 1");
      return true;
    } catch (error) {
      this.logger.error("Database health check failed", error instanceof Error ? error.stack : undefined);
      return false;
    }
  }
}

export function createPgPool(config: AppConfig): Pool {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require("pg") as typeof import("pg");

  return new Pool({
    connectionString: config.databaseUrl,
    ssl:
      config.nodeEnv === "production"
        ? {
            rejectUnauthorized: false
          }
        : undefined
  });
}
