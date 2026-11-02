import { emptyState, eventNames } from '../core/state.js';
import { computeBalances, computeTotals, suggestTransfers } from '../core/logic.js';
import { balanceLabel } from '../core/format.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

/* The app state plus everything derived from it. All writes go through commit(). */
export function createDataStore(repository) {
  return {
    state: emptyState(),
    loading: false,
    error: '',

    get eventNames() { return eventNames(this.state); },
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
      } catch (e) {
        this.error = `Chargement impossible : ${e.message}`;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.state = emptyState();
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
        this.error = `Enregistrement impossible : ${e.message}`;
        return { error: this.error };
      }
      return result;
    },
  };
}
