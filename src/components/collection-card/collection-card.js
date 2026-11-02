import { COLLECTIONS } from '../../config/collections.js';
import { listItems } from '../../core/collections.js';

/* Read-only list of a collection with a single edit button that opens the manage dialog. */
export const collectionCard = (kind) => ({
  kind,
  config: COLLECTIONS[kind],

  get rows() { return listItems(this.$store.data.state, kind, this.config.sortBy); },
  get extraFields() { return this.config.fields.filter((f) => f.key !== 'name'); },

  edit() { this.$dispatch('open-manage', { kind }); },
});
