# Golfe de Saint-Tropez

Production : https://gds.aisisters.ai

## Démarrer

Prérequis : Docker (base PostgreSQL) et `mise`.

```bash
mise install
pnpm install
cp apps/web/.env.example apps/web/.env
make dev
```

Web sur http://localhost:9999. La base de développement démarre avec `make dev` (port 5440, `PORT_BASE` et `PORT_BASE_TEST` si un autre projet l'occupe).

Le fichier à remplir est `apps/web/.env` (Nuxt ne lit pas `.env.local`). Il est ignoré par Git : aucun secret n'y entre jamais.

### Connexion sans Keycloak

Avec `ENVIRONNEMENT=dev`, ouvrir http://localhost:9999/auth/dev (compte membre) ou http://localhost:9999/auth/dev?comme=admin (compte owner) : la session est créée sans passer par Keycloak. La connexion réelle demande le Keycloak local d'aisisters-apps (http://localhost:8081), realm `client-gds`, client confidentiel `gds-web` (secret dans `AUTH_KEYCLOAK_SECRET`).

### Données CIRIL

Les écrans de suivi se remplissent depuis CIRIL. Les accès de la sandbox se demandent à l'équipe : décommenter `CIRIL_URL`, `CIRIL_UTILISATEUR` et `CIRIL_MOT_DE_PASSE` dans `apps/web/.env`, jamais ailleurs. Le tableau de bord de développement propose alors « Lancer la synchronisation ».

### Flux Git

`develop` reçoit les fusions locales des branches de ticket ; `prod` reflète ce qui est déployé (ADR 0002).

## Livrer

Pousser sur `prod` : la CI vérifie, puis publie les images. `make deploy` met la dernière version verte en production ; `make deploy TAG=sha-xxxxxxx` une version précise. Détails : `RUNBOOK.md`.

Projet généré par le template `AI-Sisters/template-mission` (`uvx copier update --trust` pour suivre ses évolutions).
