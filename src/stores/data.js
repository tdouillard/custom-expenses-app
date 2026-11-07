import { emptyState, eventNames } from '../core/state.js';
import { computeBalances, computeTotals, suggestTransfers } from '../core/logic.js';
import { balanceLabel } from '../core/format.js';
import { t } from '../core/i18n.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

/* The app state plus everything derived from it. All writes go through commit(). */
export function createDataStore(repository) {
  return {
    state: emptyState(),
    users: [],
    loading: false,
    error: '',

    get eventNames() { return eventNames(this.state); },
    userLabel(id) { const u = this.users.find((x) => x.id === id); return u ? (u.name || u.email || t('users.unnamed')) : ''; },
    /* Users not yet linked to a member (plus `keep`, the one already linked to the member being edited). */
    freeUsers(keep = '') {
      const taken = new Set(Object.values(this.state.memberUsers || {}));
      return this.users.filter((u) => u.id === keep || !taken.has(u.id));
    },
    get balances() { return computeBalances(this.state, { projected: true }); },
    get balanceRows() {
      return this.state.members.map((member) => ({ member, balance: this.balances[member], label: balanceLabel(this.balances[member]) }));
    },
    get transfers() { return suggestTransfers(this.balances); },
    get totals() { return computeTotals(this.state); },

    async load() {
      this.loading = true;
      this.error = '';
      try {
        this.state = await repository.load();
        this.users = await repository.users().catch(() => []);
      } catch (e) {
        this.error = t('app.loadError', { message: e.message });
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.state = emptyState();
      this.users = [];
      this.error = '';
    },

    /* Applies `mutate(state)` and saves. If it reports an error or saving fails, the previous state is restored. */
    async commit(mutate) {
      const snapshot = clone(this.state);
      const result = mutate(this.state) || {};
      if (result.error) {
        this.state = snapshot;
        return result;
      }
      this.error = '';
      try {
        await repository.save(this.state);
      } catch (e) {
        this.state = snapshot;
        this.error = t('app.saveError', { message: e.message });
        return { error: this.error };
      }
      return result;
    },
  };
}
