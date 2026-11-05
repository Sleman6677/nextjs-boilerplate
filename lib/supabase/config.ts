export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

/** Accounts, orders and points need both Supabase Auth and the database. */
export function accountsEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseKey() && process.env.POSTGRES_URL);
}
