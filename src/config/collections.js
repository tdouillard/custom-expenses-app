/* What the manage dialog shows for each editable collection. Labels are translation keys. Field types: text, date, tags. */
export const COLLECTIONS = {
  members: {
    title: 'collections.members',
    addLabel: 'collections.addMember',
    newLabel: 'collections.newMember',
    emptyText: 'collections.noMembers',
    fields: [
      { key: 'name', label: 'field.name', type: 'text', required: true },
      { key: 'userId', label: 'field.user', type: 'user' },
    ],
  },
  events: {
    title: 'collections.events',
    addLabel: 'collections.addEvent',
    newLabel: 'collections.newEvent',
    emptyText: 'collections.noEvents',
    sortBy: 'date',
    fields: [
      { key: 'name', label: 'field.name', type: 'text', required: true },
      { key: 'date', label: 'field.date', type: 'date' },
      { key: 'recipients', label: 'field.recipients', type: 'tags', placeholder: 'field.addPerson' },
    ],
  },
};
