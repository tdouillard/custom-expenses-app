import * as format from './core/format.js';
import { t } from './core/i18n.js';
import { loadIncludes, loadScript } from './core/include.js';
import { SupabaseClient } from './services/supabase.js';
import { StateRepository } from './services/repository.js';
import { AdminRepository } from './services/admin.js';
import { createAdminStore } from './stores/admin.js';
import { createI18nStore } from './stores/i18n.js';
import { accountPage } from './components/account/account.js';
import { adminPage } from './components/admin/admin.js';
import { forgotPasswordPage } from './components/forgot-password/forgot-password.js';
import { createAuthStore } from './stores/auth.js';
import { createDataStore } from './stores/data.js';
import { appShell } from './components/app-shell/app-shell.js';
import { collectionCard } from './components/collection-card/collection-card.js';
import { expenseDialog } from './components/expense-dialog/expense-dialog.js';
import { expenses } from './components/expenses/expenses.js';
import { importDialog } from './components/import-dialog/import-dialog.js';
import { manageDialog } from './components/manage-dialog/manage-dialog.js';
import { shareDialog } from './components/share-dialog/share-dialog.js';
import { settleDialog } from './components/settle-dialog/settle-dialog.js';
import { settlementsCard } from './components/settlements/settlements.js';

const { supabaseUrl, supabaseKey } = window.APP_CONFIG;
const client = new SupabaseClient({ url: supabaseUrl, key: supabaseKey });

await loadIncludes();

document.addEventListener('alpine:init', () => {
  const { Alpine } = window;
  Alpine.store('i18n', createI18nStore());
  /* Reading the store's language makes every binding that uses $t or $fmt re-render when it changes. */
  Alpine.magic('t', () => (key, vars) => { void Alpine.store('i18n').lang; return t(key, vars); });
  Alpine.magic('fmt', () => { void Alpine.store('i18n').lang; return format; });
  Alpine.store('data', createDataStore(new StateRepository(client)));
  Alpine.store('auth', createAuthStore(client));
  Alpine.store('admin', createAdminStore(new AdminRepository(client)));
  Object.entries({ accountPage, forgotPasswordPage, adminPage, appShell, collectionCard, expenseDialog, expenses, importDialog, manageDialog, shareDialog, settleDialog, settlementsCard })
    .forEach(([name, factory]) => Alpine.data(name, factory));
});

await loadScript('vendor/alpine.min.js');
