import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, connectDb } from './env.js';

/* Usage: npm run db:import -- user@example.com [path/to/state.json]
   Imports a local state file as events/expenses the given (signed-up) user can access. */
const [email, file = join(ROOT, 'data', 'state.json')] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run db:import -- <email> [state.json]');
  process.exit(1);
}
const state = JSON.parse(readFileSync(file, 'utf8'));
const db = await connectDb();
const { rows } = await db.query('select id from auth.users where lower(email) = lower($1)', [email]);
if (!rows.length) {
  console.error(`No user ${email}. Create the account in Supabase first.`);
  process.exit(1);
}
await db.query('select public.import_state($1, $2::jsonb)', [rows[0].id, JSON.stringify(state)]);
console.log(`State imported for ${email}`);
await db.end();
