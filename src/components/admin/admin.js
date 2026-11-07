import { linkMember } from '../../core/collections.js';
import { newId } from '../../core/expenses.js';
import { norm } from '../../core/format.js';

const key = (userId, eventId) => `${userId}|${eventId}`;
const blankUser = () => ({ email: '', password: '', name: '', member: '' });
const blankEvent = () => ({ name: '', date: '' });

/* Admin page: read-only overview of users and events. "Modifier" copies everything into a draft that is
   only written (users, roles, access, events, member links) when saved, or dropped on cancel. */
export const adminPage = () => ({
  editing: false,
  saving: false,
  formError: '',
  draft: null,
  newUser: blankUser(),
  newEvent: blankEvent(),
  seq: 0,

  memberOf(userId) {
    const links = this.$store.data.state.memberUsers || {};
    return Object.keys(links).find((name) => links[name] === userId) || '';
  },
  usersOfEvent(eventId) { return this.$store.admin.usersOf(eventId); },

  get draftUsers() { return [...this.draft.users, ...this.draft.newUsers]; },
  /* Members that no other user of the draft already stands for. */
  memberOptions(user) {
    const taken = new Set(this.draftUsers.filter((u) => u !== user && u.member).map((u) => u.member));
    return this.$store.data.state.members.filter((m) => !taken.has(m));
  },
  has(userId, eventId) { return !!this.draft.access[key(userId, eventId)]; },
  toggle(userId, eventId) { this.draft.access[key(userId, eventId)] = !this.has(userId, eventId); },

  startEdit() {
    const { users, events, access } = this.$store.admin;
    this.draft = {
      users: users.map((u) => ({ id: u.id, email: u.email, is_admin: !!u.is_admin, name: u.name || '', member: this.memberOf(u.id) })),
      newUsers: [],
      events: events.map((e) => ({ id: e.id, name: e.name, date: e.date || '', recipients: e.recipients, expenseCount: e.expenseCount })),
      removed: [],
      access: Object.fromEntries(access.map((a) => [key(a.user_id, a.event_id), true])),
    };
    this.newUser = blankUser();
    this.newEvent = blankEvent();
    this.formError = '';
    this.$store.admin.error = '';
    this.editing = true;
  },

  cancel() {
    this.editing = false;
    this.draft = null;
    this.formError = '';
  },

  addUser() {
    const u = { ...this.newUser, email: this.newUser.email.trim(), name: this.newUser.name.trim() };
    if (!/^\S+@\S+\.\S+$/.test(u.email)) { this.formError = 'Adresse email invalide.'; return; }
    if (u.password.length < 6) { this.formError = 'Mot de passe : 6 caractères minimum.'; return; }
    if (this.draftUsers.some((x) => norm(x.email) === norm(u.email))) { this.formError = 'Cet utilisateur existe déjà.'; return; }
    this.draft.newUsers.push({ ...u, id: `new-${++this.seq}`, is_admin: false, isNew: true });
    this.newUser = blankUser();
    this.formError = '';
  },
  removeNewUser(user) { this.draft.newUsers = this.draft.newUsers.filter((u) => u !== user); },

  addEvent() {
    const name = this.newEvent.name.trim();
    if (!name) { this.formError = 'Saisissez un nom.'; return; }
    if (this.draft.events.some((e) => norm(e.name) === norm(name))) { this.formError = 'Un événement porte déjà ce nom.'; return; }
    this.draft.events.push({ id: newId(), name, date: this.newEvent.date, recipients: [], expenseCount: 0, isNew: true });
    this.newEvent = blankEvent();
    this.formError = '';
  },
  removeEvent(ev) {
    this.draft.events = this.draft.events.filter((e) => e !== ev);
    if (!ev.isNew) this.draft.removed.push(ev);
  },

  validate() {
    const names = this.draft.events.map((e) => norm(e.name.trim()));
    if (names.some((n) => !n)) return 'Saisissez un nom pour chaque événement.';
    if (new Set(names).size !== names.length) return 'Deux événements portent le même nom.';
    return '';
  },

  async save() {
    const { admin, data } = this.$store;
    const d = this.draft;
    this.formError = this.validate();
    if (this.formError) return;
    const lost = d.removed.reduce((n, e) => n + e.expenseCount, 0);
    if (d.removed.length && !confirm(`Supprimer ${d.removed.length} événement(s)${lost ? ` et ${lost} dépense(s)` : ''} ?`)) return;

    this.saving = true;
    const created = {};
    const realId = (u) => created[u.id] || u.id;
    const nameOf = (u) => u.name.trim() || u.member || admin.users.find((x) => x.id === u.id)?.name || (u.isNew ? u.email.split('@')[0] : '');
    const result = await admin.run(async (r) => {
      for (const ev of d.events) {
        const old = admin.events.find((e) => e.id === ev.id);
        if (!old || old.name !== ev.name.trim() || (old.date || '') !== ev.date) await r.saveEvent({ ...ev, name: ev.name.trim() });
      }
      for (const u of d.newUsers) created[u.id] = await r.createUser(u.email, u.password);
      for (const u of this.draftUsers) {
        const old = admin.users.find((x) => x.id === u.id);
        const name = nameOf(u);
        if (!old || old.is_admin !== u.is_admin || (old.name || '') !== name) await r.setProfile(realId(u), { is_admin: u.is_admin, name });
        for (const ev of d.events) {
          const had = admin.hasAccess(ev.id, u.id);
          if (this.has(u.id, ev.id) && !had) await r.grant(ev.id, realId(u));
          else if (!this.has(u.id, ev.id) && had) await r.revoke(ev.id, u.id);
        }
      }
      for (const ev of d.removed) await r.deleteEvent(ev.id);
    });
    if (result.error) { this.saving = false; return; }

    await data.load();
    const links = this.draftUsers
      .map((u) => ({ id: realId(u), member: u.member, name: nameOf(u) }))
      .filter((l) => l.member !== this.memberOf(l.id) || (l.member && l.member !== l.name));
    if (links.length) {
      const linked = await data.commit((s) => {
        for (const l of links) {
          const res = linkMember(s, l.id, l.member, l.name);
          if (res.error) return res;
        }
      });
      if (linked.error) { this.saving = false; this.cancel(); this.$store.admin.error = linked.error; return; }
    }
    this.saving = false;
    this.cancel();
  },
});
