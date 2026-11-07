import { newId } from '../core/expenses.js';

/* Administration calls: profiles, events and who may access which event. Only admins pass RLS for most of these. */
export class AdminRepository {
  constructor(client) {
    this.client = client;
  }

  async profile() {
    const rows = await this.client.rest(`/profiles?select=id,email,name,is_admin&id=eq.${this.client.user.id}`);
    return rows?.[0] || null;
  }

  async overview() {
    const [users, events, access, expenses] = await Promise.all([
      this.client.rest('/profiles?select=id,email,name,is_admin&order=email'),
      this.client.rest('/events?select=id,name,date,recipients&order=name'),
      this.client.rest('/event_access?select=event_id,user_id'),
      this.client.rest('/expenses?select=id,event_id'),
    ]);
    const counts = {};
    expenses.forEach((x) => { counts[x.event_id] = (counts[x.event_id] || 0) + 1; });
    return { users, events: events.map((e) => ({ ...e, expenseCount: counts[e.id] || 0 })), access };
  }

  createUser(email, password) { return this.client.createUser(email, password); }

  setProfile(userId, { is_admin, name }) {
    return this.client.rest(`/profiles?id=eq.${userId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: { is_admin, name } });
  }

  grant(eventId, userId) {
    return this.client.rest('/event_access?on_conflict=event_id,user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: { event_id: eventId, user_id: userId },
    });
  }

  revoke(eventId, userId) {
    return this.client.rest(`/event_access?event_id=eq.${encodeURIComponent(eventId)}&user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }

  saveEvent({ id, name, date, recipients }) {
    return this.client.rest('/events?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { id: id || newId(), name, date: date || '', recipients: recipients || [] },
    });
  }

  deleteEvent(id) {
    return this.client.rest(`/events?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  }
}
