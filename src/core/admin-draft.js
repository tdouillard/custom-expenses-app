/* Pure helpers for the administration page: sorting the users table and counting unsaved changes. */

export const accessKey = (userId, eventId) => `${userId}|${eventId}`;

/* 0: no linked member, 1: linked to a member, 2: administrators (they have access to every event). */
export const memberRank = (u) => (u.member ? 1 : u.is_admin ? 2 : 0);

const label = (u) => u.name || u.email;

/* key 'user' sorts by name; key 'member' lists users without a linked member first. */
export function sortUsers(users, key, dir) {
  const sign = dir === 'desc' ? -1 : 1;
  const compare = key === 'member'
    ? (a, b) => memberRank(a) - memberRank(b) || (a.member || '').localeCompare(b.member || '') || label(a).localeCompare(label(b))
    : (a, b) => label(a).localeCompare(label(b));
  return [...users].sort((a, b) => sign * compare(a, b));
}

/* `draft` is the editable copy of the page, `saved` the stored users, events, access keys (a Set of accessKey) and member links ({ userId: memberName }). */
export function countChanges(draft, saved) {
  const savedUsers = new Map(saved.users.map((u) => [u.id, u]));
  const savedEvents = new Map(saved.events.map((e) => [e.id, e]));
  let count = draft.newUsers.length + draft.removed.length;

  for (const u of [...draft.users, ...draft.newUsers]) {
    const old = savedUsers.get(u.id);
    if (old) {
      if (!!old.is_admin !== u.is_admin || (old.name || '') !== u.name.trim()) count++;
      if ((saved.members[u.id] || '') !== (u.member || '')) count++;
    }
    if (u.is_admin) continue;
    for (const ev of draft.events) {
      const granted = !!draft.access[accessKey(u.id, ev.id)];
      if (granted !== saved.access.has(accessKey(u.id, ev.id))) count++;
    }
  }

  for (const ev of draft.events) {
    if (ev.isNew) { count++; continue; }
    const old = savedEvents.get(ev.id);
    if (old && (old.name !== ev.name.trim() || (old.date || '') !== (ev.date || ''))) count++;
  }
  return count;
}
