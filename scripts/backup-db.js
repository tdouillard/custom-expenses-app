import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, connectDb } from './env.js';

/* Usage: npm run db:backup [-- label]
   Stores a JSON snapshot of every public table inside Supabase (schema `backups`, last 14 kept). Nothing leaves the database. */
const label = process.argv[2] || '';
const db = await connectDb();
await db.query(readFileSync(join(ROOT, 'supabase', 'backup.sql'), 'utf8'));
const { rows } = await db.query('select backups.create_backup($1) as id', [label]);
const { rows: [count] } = await db.query('select count(*)::int as n from backups.snapshots');
console.log(`Backup #${rows[0].id} created (${count.n} kept)`);
await db.end();
