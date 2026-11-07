# Dépenses & remboursements

Application de partage de dépenses : statique (GitHub Pages), [Alpine.js](https://alpinejs.dev) + modules ES, stockage et authentification [Supabase](https://supabase.com) (OrioleDB).

Site : https://tdouillard.github.io/custom-expenses-app/ (branche `dev`, dossier `/`).

## Structure

- `index.html` : page, assemble les composants (`data-include`).
- `src/components/<nom>/` : un dossier par composant (`.html`, `.js`, `.css`).
- `src/core/` : logique pure (calculs, filtres, CSV, formulaires), sans DOM.
- `src/config/` : colonnes du tableau et collections (membres, événements) — pilotent le rendu générique.
- `src/services/` : client Supabase (fetch) et dépôt de l'état.
- `src/stores/` : stores Alpine (auth, données).
- `supabase/schema.sql` : tables partagées (`profiles`, `members`, `events`, `event_access`, `expenses`, `settlements`) + RLS.
- Aucun HTML dans le JS ; aucune étape de build.

## Mise en route

1. Créer `.env` (voir `.env.example`) avec `SUPABASE_URL`, la clé publiable et `SUPABASE_DB_PASSWORD`.
2. `npm install`
3. `npm run config` : génère `config.js` (URL + clé publiable uniquement, commité).
4. `npm run db:setup` : applique `supabase/schema.sql`.
5. `npm start` puis http://localhost:3003.

Le mot de passe de la base ne sert qu'aux scripts locaux ; il n'est jamais envoyé au navigateur ni commité.

Importer des données existantes (le compte doit déjà exister) : `npm run db:import -- <email> [state.json]`.

## Accès partagé et administration

- Chaque événement (et ses dépenses) n'est visible que des utilisateurs à qui l'accès a été accordé ; les administrateurs voient tout. L'auteur d'un événement y a accès automatiquement.
- Les membres et les remboursements sont partagés par tous les utilisateurs connectés.
- L'onglet **Administration** (visible des administrateurs) permet de gérer les rôles, les accès par événement, et de créer / renommer / supprimer des événements.
- Premier administrateur : dans l'éditeur SQL de Supabase, `update public.profiles set is_admin = true where email = '<email>';`.
- Migration : lancer `npm run db:setup` reprend une fois les anciennes lignes `app_state` (leurs propriétaires deviennent administrateurs). La table `app_state` n'est plus utilisée et peut être supprimée ensuite.

## Authentification

L'application ne propose que la connexion : les comptes se créent directement dans Supabase (Authentication → Users → Add user). Pour empêcher toute inscription via l'API, désactiver aussi *Allow new users to sign up* dans Supabase → Authentication → Sign In / Providers → Email.

Dans Supabase → Authentication → URL Configuration, ajouter l'URL du site GitHub Pages comme *Site URL* / *Redirect URL*.

## Tests

- `npm test` : tests unitaires (`node --test`).
- `npm run test:e2e` : Playwright (Supabase simulé). Première fois : `npx playwright install chromium`.
