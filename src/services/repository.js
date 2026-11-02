import { normalizeState } from '../core/state.js';

/* Persists the whole app state as the signed-in user's single row of public.app_state. */
export class StateRepository {
  constructor(client) {
    this.client = client;
  }

  async load() {
    const rows = await this.client.rest('/app_state?select=state&limit=1');
    return normalizeState(rows?.[0]?.state);
  }

  async save(state) {
    await this.client.rest('/app_state?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: { user_id: this.client.user.id, state },
    });
  }
}
