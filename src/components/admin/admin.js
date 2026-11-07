import { linkMember } from '../../core/collections.js';
import { dialogMixin } from '../../core/dialog.js';
import { newId } from '../../core/expenses.js';
import { norm } from '../../core/format.js';
import { accessKey, countChanges, sortUsers } from '../../core/admin-draft.js';

const PAGE = 10;
const SHOWN_PEOPLE = 5;
const PALETTES = ['#4f8cff,#2dd4ff', '#f5b84b,#ff6b8a', '#3ddc97,#2dd4ff', '#b07cff,#ff6b8a', '#2dd4ff,#4f8cff'];
const blankUser = () => ({ email: '', password: '', name: '', member: '' });

const pageOf = (list, page) => {
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const current = Math.min(page, pages - 1);
  const start = current * PAGE;
  return {
    rows: list.slice(start, start + PAGE),
    page: current,
    pages,
    total: list.length,
    from: list.length ? start + 1 : 0,
    to: Math.min(list.length, start + PAGE),
  };
};

/* Admin page: users, roles, access and events are edited in a draft that is only written when saved (users, roles, access,
   events, member links). Discard rebuilds the draft from the stored data. */
export const adminPage = () => ({
  ...dialogMixin,
  draft: null,
  saving: false,
  formError: '',
  userQuery: '',
  eventQuery: '',
  sort: { key: 'user', dir: 'asc' },
  userPage: 0,
  eventPage: 0,
  picker: null,
  pickerQuery: '',
  drawerId: null,
  dialogKind: 'user',
  newUser: blankUser(),
  eventForm: { id: '', name: '', date: '', isNew: true },
  seq: 0,

  init() {
    this.resetDraft();
    const sync = () => { if (!this.dirtyCount && !this.saving) this.resetDraft(); };
    this.$watch('$store.admin.users', sync);
    this.$watch('$store.admin.events', sync);
    this.$watch('$store.admin.access', sync);
    this.$watch('$store.data.state', sync);
  },

  memberOf(userId) {
    const links = this.$store.data.state.memberUsers || {};
    return Object.keys(links).find((name) => links[name] === userId) || '';
  },
  get draftUsers() { return [...this.draft.users, ...this.draft.newUsers]; },
  /* Members that no other user of the draft already stands for. */
  memberOptions(user) {
    const taken = new Set(this.draftUsers.filter((u) => u !== user && u.member).map((u) => u.member));
    return this.$store.data.state.members.filter((m) => !taken.has(m));
  },

  has(userId, eventId) { return !!this.draft.access[accessKey(userId, eventId)]; },
  savedHas(userId, eventId) { return this.$store.admin.hasAccess(eventId, userId); },
  isChanged(userId, eventId) { return this.has(userId, eventId) !== this.savedHas(userId, eventId); },
  toggle(userId, eventId) { this.draft.access[accessKey(userId, eventId)] = !this.has(userId, eventId); },
  /* Events shown as tags on a user's row: the granted ones, plus revoked ones still waiting to be saved. */
  tagsOf(u) { return this.draft.events.filter((ev) => this.has(u.id, ev.id) || this.savedHas(u.id, ev.id)); },
  peopleOf(ev) {
    const people = this.draftUsers.filter((u) => u.is_admin || this.has(u.id, ev.id))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    return { count: people.length, shown: people.slice(0, SHOWN_PEOPLE) };
  },
  totalOf(ev) {
    const saved = this.$store.admin.events.find((e) => e.id === ev.id);
    const name = saved ? saved.name : ev.name;
    return this.$store.data.state.expenses.filter((x) => x.event === name).reduce((n, x) => n + Number(x.amount || 0), 0);
  },
  initials(u) {
    return (u.name || u.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  },
  avatarStyle(u) {
    const i = [...u.id].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTES.length;
    return `background:linear-gradient(135deg,${PALETTES[i]})`;
  },

  get savedSnapshot() {
    const { admin } = this.$store;
    return {
      users: admin.users,
      events: admin.events,
      access: new Set(admin.access.map((a) => accessKey(a.user_id, a.event_id))),
      members: Object.fromEntries(admin.users.map((u) => [u.id, this.memberOf(u.id)])),
    };
  },
  get dirtyCount() { return this.draft ? countChanges(this.draft, this.savedSnapshot) : 0; },

  get stats() {
    const users = this.draftUsers;
    const events = this.draft.events;
    return {
      users: users.length,
      admins: users.filter((u) => u.is_admin).length,
      events: events.length,
      expenses: events.reduce((n, ev) => n + ev.expenseCount, 0),
      total: events.reduce((n, ev) => n + this.totalOf(ev), 0),
      grants: users.filter((u) => !u.is_admin).reduce((n, u) => n + events.filter((ev) => this.has(u.id, ev.id)).length, 0),
      unlinked: users.filter((u) => !u.is_admin && !u.member).length,
    };
  },

  get usersView() {
    const q = this.userQuery.trim().toLowerCase();
    const list = this.draftUsers.filter((u) => !q || (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    return pageOf(sortUsers(list, this.sort.key, this.sort.dir), this.userPage);
  },
  get eventsView() {
    const q = this.eventQuery.trim().toLowerCase();
    return pageOf(this.draft.events.filter((ev) => !q || ev.name.toLowerCase().includes(q)), this.eventPage);
  },
  sortBy(key) {
    if (this.sort.key === key) this.sort.dir = this.sort.dir === 'asc' ? 'desc' : 'asc';
    else this.sort = { key, dir: 'asc' };
    this.userPage = 0;
  },
  sortArrow(key) { return this.sort.key === key ? (this.sort.dir === 'asc' ? '↑' : '↓') : '↕'; },
  sortAria(key) {
    if (this.sort.key !== key) return 'none';
    return this.sort.dir === 'asc' ? 'ascending' : 'descending';
  },

  get drawerUser() { return this.draftUsers.find((u) => u.id === this.drawerId) || null; },
  openDrawer(userId) { this.drawerId = userId; },
  closeDrawer() { this.drawerId = null; },
  removeNewUser(user) {
    this.draft.newUsers = this.draft.newUsers.filter((u) => u !== user);
    this.closeDrawer();
  },

  get pickerUser() { return this.picker ? this.draftUsers.find((u) => u.id === this.picker.userId) || null : null; },
  get pickerEvents() {
    const q = this.pickerQuery.trim().toLowerCase();
    return this.draft.events.filter((ev) => !q || ev.name.toLowerCase().includes(q));
  },
  openPicker(event, userId) {
    const r = event.currentTarget.getBoundingClientRect();
    const below = r.bottom + 400 < innerHeight;
    this.picker = {
      userId,
      left: Math.max(8, Math.min(r.left, innerWidth - 356)),
      top: below ? r.bottom + 8 : Math.max(8, r.top - 408),
    };
    this.pickerQuery = '';
    this.$nextTick(() => this.$refs.pickerSearch?.focus());
  },
  get pickerStyle() { return this.picker ? `top:${this.picker.top}px;left:${this.picker.left}px` : ''; },
  closePicker() { this.picker = null; },

  resetDraft() {
    const { users, events, access } = this.$store.admin;
    this.draft = {
      users: users.map((u) => ({ id: u.id, email: u.email, is_admin: !!u.is_admin, name: u.name || '', member: this.memberOf(u.id) })),
      newUsers: [],
      events: events.map((e) => ({ id: e.id, name: e.name, date: e.date || '', recipients: e.recipients, expenseCount: e.expenseCount })),
      removed: [],
      access: Object.fromEntries(access.map((a) => [accessKey(a.user_id, a.event_id), true])),
    };
  },
  discard() {
    this.resetDraft();
    this.formError = '';
    this.closeDrawer();
    this.closePicker();
  },

  openAddUser() {
    this.dialogKind = 'user';
    this.newUser = blankUser();
    this.openDialog();
  },
  addUser() {
    const u = { ...this.newUser, email: this.newUser.email.trim(), name: this.newUser.name.trim() };
    if (!/^\S+@\S+\.\S+$/.test(u.email)) { this.error = this.$t('admin.errEmail'); return; }
    if (u.password.length < 6) { this.error = this.$t('admin.errPassword'); return; }
    if (this.draftUsers.some((x) => norm(x.email) === norm(u.email))) { this.error = this.$t('admin.errUserExists'); return; }
    this.draft.newUsers.push({ ...u, id: `new-${++this.seq}`, is_admin: false, isNew: true });
    this.closeDialog();
  },

  openNewEvent() {
    this.dialogKind = 'event';
    this.eventForm = { id: '', name: '', date: '', isNew: true };
    this.openDialog();
  },
  openEditEvent(ev) {
    this.dialogKind = 'event';
    this.eventForm = { id: ev.id, name: ev.name, date: ev.date, isNew: false };
    this.openDialog();
  },
  saveEvent() {
    const name = this.eventForm.name.trim();
    if (!name) { this.error = this.$t('common.enterName'); return; }
    if (this.draft.events.some((e) => e.id !== this.eventForm.id && norm(e.name) === norm(name))) {
      this.error = this.$t('admin.errEventTaken');
      return;
    }
    if (this.eventForm.isNew) {
      this.draft.events.push({ id: newId(), name, date: this.eventForm.date, recipients: [], expenseCount: 0, isNew: true });
    } else {
      Object.assign(this.draft.events.find((e) => e.id === this.eventForm.id), { name, date: this.eventForm.date });
    }
    this.closeDialog();
  },
  removeEvent(ev) {
    this.draft.events = this.draft.events.filter((e) => e !== ev);
    if (!ev.isNew) this.draft.removed.push(ev);
  },

  validate() {
    const names = this.draft.events.map((e) => norm(e.name.trim()));
    if (names.some((n) => !n)) return this.$t('admin.errEventName');
    if (new Set(names).size !== names.length) return this.$t('admin.errEventDuplicate');
    return '';
  },

  async save() {
    const { admin, data } = this.$store;
    const d = this.draft;
    this.formError = this.validate();
    if (this.formError) return;
    const lost = d.removed.reduce((n, e) => n + e.expenseCount, 0);
    const question = lost
      ? this.$t('admin.confirmDeleteExpenses', { count: d.removed.length, expenses: lost })
      : this.$t('admin.confirmDeleteEvents', { count: d.removed.length });
    if (d.removed.length && !confirm(question)) return;

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
      if (linked.error) { this.saving = false; this.discard(); admin.error = linked.error; return; }
    }
    this.saving = false;
    this.discard();
  },
});
