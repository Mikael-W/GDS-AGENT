# CLAUDE.md

Golfe de Saint-Tropez : projet client d'AI Sisters, généré depuis le template `AI-Sisters/template-mission` (réponses dans `.copier-answers.yml`). Production : https://gds.aisisters.ai (VM `gds`, `/opt/gds`). Formule de maintenance : F1.

## Règle absolue : zéro legacy

Le code reflète à tout instant exactement l'état voulu, sans strate morte, quel que soit l'effort :
- aucun code commenté « au cas où », aucun import, fichier, variable ou dépendance inutilisé ;
- aucune branche de compatibilité ni repli vers un ancien comportement : on migre franchement et on supprime l'ancien ;
- on renomme et refactore plutôt que dupliquer et déprécier ; le legacy croisé en chemin se nettoie dans la foulée ;
- aucun TODO laissé en place : soit on le fait, soit on l'inscrit dans `kanban/`.

## Règles maison

- Aucun emoji et aucun tiret cadratin ni demi-cadratin, nulle part : interface, textes, commentaires, commits, réponses.
- L'interface est en français, sans jargon technique : une erreur parle du produit, pas de l'infra.
- Aucun déploiement sans demande explicite. Déployer = `make deploy`, jamais `docker compose` ni commandes à la main sur la VM.
- Une branche par ticket (`<type>/<sujet-court>`), une demande de fusion, relue le vendredi : `main` ne reçoit que des fusions (ADR 0002). Lister ses propres fichiers (`git add <fichiers>`, jamais `git add -A` : d'autres sessions travaillent dans le même arbre). Un fichier inattendu dans `git status` : s'arrêter et demander. Messages en français : `type(portée): sujet`.
- Aucun secret ni donnée client dans Git : ni `.env`, ni fichier déposé, ni export, ni sauvegarde. Les secrets de prod vivent dans le coffre (`secret/gds/prod`), jamais à l'écran ni dans un journal.
- Aucun mail réel depuis le poste : en local, tout part vers le Mailpit commun (`smtp://localhost:1025`, interface http://localhost:8025).
- Appels LLM en Europe uniquement (Bedrock `eu-west-3`) ; un autre fournisseur s'inscrit d'abord comme sous-traitant dans `RUNBOOK.md`.
- Valider aux frontières (formulaires, réponses des API tierces, réglages) avec Zod, faire confiance au code interne.
- Appels réseau sortants et SDK LLM cantonnés à leur module : Biome refuse `fetch` hors d'un client dédié déclaré dans ses overrides (les tests de contrat en sont un), et le SDK LLM (`ai`, `@ai-sdk/amazon-bedrock`, `@ai-sdk/openai-compatible`) hors de `apps/web/server/utils/llm.ts`.

## Commandes

```bash
mise install      # outils aux versions de la prod (une fois)
make dev          # base Docker + apps avec rechargement à chaud (Turborepo)
make test         # tests, base de test jetable
make lint         # Biome, types
make migration NOM=<nom>   # migration Drizzle nommée, après une modification de packages/db/src/schema.ts
make deploy       # production (TAG=sha-xxxxxxx pour une version précise)
make help         # tout le reste
```

## Carte

| Quoi | Où |
|---|---|
| Monorepo | pnpm + Turborepo (`pnpm-workspace.yaml`, `turbo.json`), Biome (`biome.json`), versions des outils dans `mise.toml` |
| Web (Nuxt 4, Vue 3, Nitro) | `apps/web` : pages `app/pages/`, composants `app/components/`, routes serveur `server/api/`, utilitaires serveur `server/utils/`, réglages validés `server/utils/env.ts` (ADR 0004) |
| Connexion | `apps/web/server/api/auth/keycloak.get.ts` (nuxt-auth-utils, flux OIDC côté serveur), déconnexion `server/api/auth/deconnexion.post.ts` ; le navigateur ne voit que `user` via `useUserSession`, jamais les jetons |
| Santé | `/api/health`, `/api/health/ready` (`server/utils/sante.ts` : base et planificateur), `/api/version` ; Caddy les sert aussi en `/health`, `/health/ready`, `/version` |
| Base | PostgreSQL 17, Drizzle dans `packages/db` (partagé par le web et le worker) : schéma `src/schema.ts`, `creerBase(url, max)`, migrations `drizzle/` jouées au déploiement (service `migrations`) ; le web s'y connecte par `apps/web/server/utils/base.ts` |
| Worker (pg-boss) | `apps/worker` : files et tâches planifiées (`src/worker.ts`), réglages validés `src/env.ts`, arrêt propre ; la tâche `maintenance.battement` écrit chaque minute dans `battements`, contrôlé par `/health/ready` (`planificateur`) |
| LLM | `apps/web/server/utils/llm.ts` (Vercel AI SDK), prompts dans `apps/web/prompts/*.md`, jamais dans le code ; Biome refuse d'importer le SDK ailleurs |
| Tests | `apps/web/tests/`, `apps/worker/tests/` ; contrats des API tierces dans `apps/web/contrats/` (chaque nuit) |
| Déploiement | `compose.yml` (base) + `deploy/compose.prod.yml`, `deploy/deploy.sh` (retour arrière), `deploy/sauvegarde.sh`, `scripts/deploy.sh` (poste de l'opérateur) |
| CI | `.github/workflows/ci.yml` (secrets, qualité, images), `contrats.yml` (chaque nuit) |
| Exploitation | `RUNBOOK.md` ; suivi du travail `kanban/` ; décisions `docs/adr/` ; standard `docs/passage-en-maintenance.md` |

## Authentification

Keycloak, realm `client-gds` sur https://auth.agents.aisisters.ai, client confidentiel `gds-web`. Un compte est désigné par son `sub`, jamais par son email. Aucune auth maison. La connexion se fait côté serveur (Auth.js) : aucun jeton n'atteint le navigateur, qui ne voit que l'identité.
Rôles (`membre`, `owner`) recopiés de Keycloak à chaque connexion (`lib/roles.ts`), jamais édités dans l'application : `owner` est l'équipe AI Sisters, entrée par le fournisseur `aisisters` du realm (claim `identity_provider` du jeton d'accès).

## Template

Ce projet suit le template : `uvx copier update --trust` applique ses nouvelles versions (relire le diff, résoudre les conflits). Ne pas modifier `.copier-answers.yml` à la main.
