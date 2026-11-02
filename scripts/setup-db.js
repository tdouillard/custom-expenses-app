import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, connectDb } from './env.js';

/* Creates the app_state table, policies and trigger on the Supabase project from .env. */
const db = await connectDb();
await db.query(readFileSync(join(ROOT, 'supabase', 'schema.sql'), 'utf8'));
const { rows } = await db.query("select count(*)::int as policies from pg_policies where tablename = 'app_state'");
console.log(`app_state ready (${rows[0].policies} policies)`);
await db.end();
