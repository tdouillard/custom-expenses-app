import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, connectDb } from './env.js';

/* Creates the shared tables, helpers, policies and triggers on the Supabase project from .env. */
const db = await connectDb();
await db.query(readFileSync(join(ROOT, 'supabase', 'schema.sql'), 'utf8'));
const { rows } = await db.query("select count(*)::int as policies from pg_policies where schemaname = 'public' and tablename in ('profiles','members','events','event_access','expenses','settlements')");
console.log(`Schema ready (${rows[0].policies} policies)`);
await db.end();
