import postgres from "postgres";

/**
 * Server-only Postgres access (Supabase connection string from the Vercel integration).
 * POSTGRES_URL is the pooled connection; `prepare: false` is required by the transaction pooler.
 */
export function dbConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

const globalForDb = globalThis as unknown as { __seragSql?: postgres.Sql };

export function sql(): postgres.Sql {
  if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is not set");
  if (!globalForDb.__seragSql) {
    globalForDb.__seragSql = postgres(process.env.POSTGRES_URL, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: { undefined: null },
    });
  }
  return globalForDb.__seragSql;
}

/** numeric columns come back as strings; convert safely. */
export const n = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
