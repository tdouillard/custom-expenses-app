import { norm } from '../../core/format.js';

const blank = () => ({ id: '', name: '', date: '' });

/* Admin page: create, rename, date and delete events. Access and roles are handled by the admin store. */
export const adminPage = () => ({
  draft: blank(),
  formError: '',

  reset() { this.draft = blank(); this.formError = ''; },
  edit(ev) { this.draft = { id: ev.id, name: ev.name, date: ev.date || '' }; this.formError = ''; },

  async save() {
    const name = this.draft.name.trim();
    const events = this.$store.admin.events;
    if (!name) { this.formError = 'Saisissez un nom.'; return; }
    if (events.some((e) => e.id !== this.draft.id && norm(e.name) === norm(name))) { this.formError = 'Un événement porte déjà ce nom.'; return; }
    const current = events.find((e) => e.id === this.draft.id);
    const result = await this.$store.admin.saveEvent({ ...this.draft, name, recipients: current?.recipients });
    if (!result.error) { this.reset(); await this.$store.data.load(); }
  },

  async remove(ev) {
    const detail = ev.expenseCount ? ` et ses ${ev.expenseCount} dépense(s)` : '';
    if (!confirm(`Supprimer « ${ev.name} »${detail} ?`)) return;
    const result = await this.$store.admin.deleteEvent(ev.id);
    if (!result.error) await this.$store.data.load();
  },
});
