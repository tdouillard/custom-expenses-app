import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, connectDb } from './env.js';

/* Usage: npm run db:import -- user@example.com [path/to/state.json]
   Copies a local state file into the app_state row of an existing (signed-up) user. */
const [email, file = join(ROOT, 'data', 'state.json')] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run db:import -- <email> [state.json]');
  process.exit(1);
}
const state = JSON.parse(readFileSync(file, 'utf8'));
const db = await connectDb();
const { rows } = await db.query('select id from auth.users where lower(email) = lower($1)', [email]);
if (!rows.length) {
  console.error(`No user ${email}. Sign up in the app first.`);
  process.exit(1);
}
await db.query(
  `insert into public.app_state (user_id, state) values ($1, $2)
   on conflict (user_id) do update set state = excluded.state`,
  [rows[0].id, JSON.stringify(state)],
);
console.log(`State imported for ${email}`);
await db.end();
