import { removeSettlement } from '../../core/settlements.js';

export const settlementsCard = () => ({
  remove(index) {
    if (!confirm(this.$t('settlements.confirmDelete'))) return;
    return this.$store.data.commit((s) => removeSettlement(s, index));
  },
});
