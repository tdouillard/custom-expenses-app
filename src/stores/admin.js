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
        this.error = `Chargement impossible : ${e.message}`;
      } finally {
        this.loading = false;
      }
    },

    /* Runs a write then reloads the lists. Returns { error } on failure. */
    async run(action) {
      this.error = '';
      try {
        await action(repository);
      } catch (e) {
        this.error = `Action impossible : ${e.message}`;
        return { error: this.error };
      }
      await this.refresh();
      return {};
    },

    toggleAccess(eventId, userId) {
      return this.run((r) => (this.hasAccess(eventId, userId) ? r.revoke(eventId, userId) : r.grant(eventId, userId)));
    },
    setAdmin(userId, value) { return this.run((r) => r.setAdmin(userId, value)); },
    saveEvent(event) { return this.run((r) => r.saveEvent(event)); },
    deleteEvent(id) { return this.run((r) => r.deleteEvent(id)); },
  };
}
