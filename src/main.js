import * as format from './core/format.js';
import { loadIncludes, loadScript } from './core/include.js';
import { SupabaseClient } from './services/supabase.js';
import { StateRepository } from './services/repository.js';
import { createAuthStore } from './stores/auth.js';
import { createDataStore } from './stores/data.js';
import { appShell } from './components/app-shell/app-shell.js';
import { collectionCard } from './components/collection-card/collection-card.js';
import { expenseDialog } from './components/expense-dialog/expense-dialog.js';
import { expenses } from './components/expenses/expenses.js';
import { importDialog } from './components/import-dialog/import-dialog.js';
import { manageDialog } from './components/manage-dialog/manage-dialog.js';
import { settleDialog } from './components/settle-dialog/settle-dialog.js';
import { settlementsCard } from './components/settlements/settlements.js';

const { supabaseUrl, supabaseKey } = window.APP_CONFIG;
const client = new SupabaseClient({ url: supabaseUrl, key: supabaseKey });

await loadIncludes();

document.addEventListener('alpine:init', () => {
  const { Alpine } = window;
  Alpine.magic('fmt', () => format);
  Alpine.store('data', createDataStore(new StateRepository(client)));
  Alpine.store('auth', createAuthStore(client));
  Object.entries({ appShell, collectionCard, expenseDialog, expenses, importDialog, manageDialog, settleDialog, settlementsCard })
    .forEach(([name, factory]) => Alpine.data(name, factory));
});

await loadScript('vendor/alpine.min.js');
