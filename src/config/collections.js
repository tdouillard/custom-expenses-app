/* What the manage dialog shows for each editable collection. Field types: text, date, tags. */
export const COLLECTIONS = {
  members: {
    title: 'Membres',
    singular: 'membre',
    emptyText: 'Aucun membre',
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true },
      { key: 'userId', label: 'Utilisateur', type: 'user' },
    ],
  },
  events: {
    title: 'Événements',
    singular: 'événement',
    emptyText: 'Aucun événement',
    sortBy: 'date',
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'recipients', label: 'Pour (personnes)', type: 'tags', placeholder: 'Ajouter une personne' },
    ],
  },
};
