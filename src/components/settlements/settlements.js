import { removeSettlement } from '../../core/settlements.js';

export const settlementsCard = () => ({
  remove(index) {
    if (!confirm('Supprimer ce remboursement ?')) return;
    return this.$store.data.commit((s) => removeSettlement(s, index));
  },
});
