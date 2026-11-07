import { t } from '../core/i18n.js';

/* Admin state: whether the user is an admin, which page is shown, and the users / events / access lists. */
export function createAdminStore(repository) {
  return {
    isAdmin: false,
    view: 'dashboard',
    users: [],
    events: [],
    access: [],
    loading: false,
    error: '',

    hasAccess(eventId, userId) { return this.access.some((a) => a.event_id === eventId && a.user_id === userId); },
    eventsOf(userId) { return this.events.filter((e) => this.hasAccess(e.id, userId)); },
    usersOf(eventId) { return this.users.filter((u) => this.hasAccess(eventId, u.id)); },

    async init() {
      try {
        this.isAdmin = !!(await repository.profile())?.is_admin;
      } catch {
        this.isAdmin = false;
      }
      if (this.isAdmin) await this.refresh();
    },

    reset() {
      Object.assign(this, { isAdmin: false, view: 'dashboard', users: [], events: [], access: [], error: '' });
    },

    async refresh() {
      this.loading = true;
      try {
        Object.assign(this, await repository.overview());
      } catch (e) {
        this.error = t('app.loadError', { message: e.message });
      } finally {
        this.loading = false;
      }
    },

    /* Runs writes then reloads the lists once. Returns { error } on failure. */
    async run(action) {
      this.error = '';
      try {
        await action(repository);
      } catch (e) {
        this.error = t('app.actionError', { message: e.message });
        await this.refresh();
        return { error: this.error };
      }
      await this.refresh();
      return {};
    },
  };
}
