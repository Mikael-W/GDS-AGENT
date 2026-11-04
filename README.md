# Golfe de Saint-Tropez

Production : https://gds.aisisters.ai

## Démarrer

```bash
mise install
cp apps/web/.env.example apps/web/.env.local
make dev
```

Web sur http://localhost:3000. La connexion demande le Keycloak local d'aisisters-apps (http://localhost:8081) avec un realm `client-gds` et un client confidentiel `gds-web` (secret dans `AUTH_KEYCLOAK_SECRET`).

Ports de la base de développement surchargeables (`PORT_BASE`, `PORT_BASE_TEST`) quand un autre projet occupe 5440 et 5441.

## Livrer

Pousser sur `main` : la CI vérifie, puis publie les images. `make deploy` met la dernière version verte en production ; `make deploy TAG=sha-xxxxxxx` une version précise. Détails : `RUNBOOK.md`.

Projet généré par le template `AI-Sisters/template-mission` (`uvx copier update --trust` pour suivre ses évolutions).
