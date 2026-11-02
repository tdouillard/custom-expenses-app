import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* Minimal .env reader: KEY=value, optional surrounding quotes, # comments. Process env wins. */
export function loadEnv(file = join(ROOT, '.env')) {
  const out = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...out, ...process.env };
}

/* Browser-safe values only: project URL and publishable key. */
export function publicConfig(env = loadEnv()) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.STRIPE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and a publishable key are required in .env');
  return { url, key };
}

export async function connectDb(env = loadEnv()) {
  const { default: pg } = await import('pg');
  const ref = new URL(env.SUPABASE_URL).hostname.split('.')[0];
  const client = new pg.Client({
    host: env.SUPABASE_DB_HOST || `db.${ref}.supabase.co`,
    port: 5432,
    user: 'postgres',
    password: env.SUPABASE_DB_PASSWORD,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  return client;
}
