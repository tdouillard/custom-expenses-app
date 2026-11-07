import test from 'node:test';
import assert from 'node:assert/strict';
import { countChanges, sortUsers } from '../../src/core/admin-draft.js';

const users = [
  { id: 'u1', email: 'zoe@x.com', name: 'Zoe', is_admin: false, member: 'Zoe' },
  { id: 'u2', email: 'amy@x.com', name: 'Amy', is_admin: false, member: '' },
  { id: 'u3', email: 'max@x.com', name: 'Max', is_admin: true, member: '' },
  { id: 'u4', email: 'ben@x.com', name: 'Ben', is_admin: false, member: 'Ben' },
];

test('sortUsers sorts by name in both directions', () => {
  assert.deepEqual(sortUsers(users, 'user', 'asc').map((u) => u.name), ['Amy', 'Ben', 'Max', 'Zoe']);
  assert.deepEqual(sortUsers(users, 'user', 'desc').map((u) => u.name), ['Zoe', 'Max', 'Ben', 'Amy']);
});

test('sortUsers by member lists users without a linked member first and administrators last', () => {
  assert.deepEqual(sortUsers(users, 'member', 'asc').map((u) => u.name), ['Amy', 'Ben', 'Zoe', 'Max']);
});

const saved = () => ({
  users: [
    { id: 'a', is_admin: false, name: 'Alice' },
    { id: 'b', is_admin: true, name: 'Bob' },
  ],
  events: [{ id: 'e1', name: 'Trip', date: '2024-05-01' }],
  access: new Set(['a|e1']),
  members: { a: 'Alice', b: '' },
});

const draft = () => ({
  users: [
    { id: 'a', email: 'a@x.com', is_admin: false, name: 'Alice', member: 'Alice' },
    { id: 'b', email: 'b@x.com', is_admin: true, name: 'Bob', member: '' },
  ],
  newUsers: [],
  events: [{ id: 'e1', name: 'Trip', date: '2024-05-01', expenseCount: 0 }],
  removed: [],
  access: { 'a|e1': true },
});

test('countChanges is zero when the draft matches the stored data', () => {
  assert.equal(countChanges(draft(), saved()), 0);
});

test('countChanges counts a revoked access once', () => {
  const d = draft();
  d.access = {};
  assert.equal(countChanges(d, saved()), 1);
});

test('countChanges counts renamed events, new events and removed events', () => {
  const renamed = draft();
  renamed.events[0].name = 'Holidays';
  assert.equal(countChanges(renamed, saved()), 1);

  const added = draft();
  added.events.push({ id: 'new', name: 'Camping', date: '', expenseCount: 0, isNew: true });
  assert.equal(countChanges(added, saved()), 1);

  const removed = draft();
  removed.removed.push({ id: 'e9', name: 'Old', expenseCount: 0 });
  assert.equal(countChanges(removed, saved()), 1);
});

test('countChanges counts a new user and the access granted to it', () => {
  const d = draft();
  d.newUsers.push({ id: 'new-1', email: 'c@x.com', is_admin: false, name: '', member: '', isNew: true });
  d.access['new-1|e1'] = true;
  assert.equal(countChanges(d, saved()), 2);
});

test('countChanges counts a member link change', () => {
  const d = draft();
  d.users[0].member = '';
  assert.equal(countChanges(d, saved()), 1);
});
