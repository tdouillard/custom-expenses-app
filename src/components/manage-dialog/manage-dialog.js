import { COLLECTIONS } from '../../config/collections.js';
import { blankItem, listItems, removeItem, saveItem } from '../../core/collections.js';
import { dialogMixin } from '../../core/dialog.js';
import { norm, parseList } from '../../core/format.js';

const clone = (v) => JSON.parse(JSON.stringify(v));

/* One popup that lists every item of a collection and edits one at a time. */
export const manageDialog = () => ({
  ...dialogMixin,
  kind: 'members',
  view: 'list',
  index: -1,
  draft: {},
  tagInputs: {},

  get config() { return COLLECTIONS[this.kind]; },
  get rows() { return listItems(this.$store.data.state, this.kind, this.config.sortBy); },
  get extraFields() { return this.config.fields.filter((f) => f.key !== 'name'); },
  get editing() { return this.index >= 0; },

  open({ kind }) {
    this.kind = kind;
    this.view = 'list';
    this.openDialog();
  },

  startEdit(index, item) {
    this.index = index;
    this.draft = clone(item);
    this.tagInputs = {};
    this.error = '';
    this.view = 'edit';
  },
  add() { this.startEdit(-1, blankItem(this.kind)); },
  back() { this.view = 'list'; this.error = ''; },

  async save() {
    const result = await this.$store.data.commit((s) => saveItem(s, this.kind, this.index, this.draft));
    if (result.error) this.error = result.error;
    else this.back();
  },

  async remove() {
    if (!confirm(`Supprimer « ${this.draft.name} » ?`)) return;
    const result = await this.$store.data.commit((s) => removeItem(s, this.kind, this.index));
    if (result.error) this.error = result.error;
    else this.back();
  },

  addTags(field) {
    const list = this.draft[field.key];
    parseList(this.tagInputs[field.key]).forEach((p) => {
      if (!list.some((x) => norm(x) === norm(p))) list.push(p);
    });
    this.tagInputs[field.key] = '';
  },
  removeTag(field, i) { this.draft[field.key].splice(i, 1); },

  pickUser(field) {
    const label = this.$store.data.userLabel(this.draft[field.key]);
    if (label) this.draft.name = label;
  },
});
