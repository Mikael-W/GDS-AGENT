# Passage en maintenance : Golfe de Saint-Tropez

Reprise du standard d'aisisters-infra (`docs/maintenance/standard.md`, qui fait foi). Le template coche d'office ce qui est dans le dépôt ; le reste se branche une fois, à la création du projet. Chaque case se vérifie par la commande indiquée.

## 1. Dépôt

- [ ] Privé, dans `AI-Sisters`, branche par défaut `main` : `gh repo view AI-Sisters/gds --json visibility,defaultBranchRef`.
- [x] `CLAUDE.md` de moins de 200 lignes, `kanban/`, `RUNBOOK.md` : `wc -l CLAUDE.md`.
- [x] `.gitignore` : `.env*` (sauf `.env.example`), `data/`, `storage/`, uploads, exports, sauvegardes.
- [x] gitleaks sur chaque push (job `secrets` de la CI, règles dans `.gitleaks.toml`).
- [ ] Jeux de test anonymisés (à tenir à chaque ajout de données de test).

## 2. CI

- [x] `runs-on: [self-hosted, aisisters-ci]` partout : `grep -h runs-on .github/workflows/*.yml | sort -u`.
- [x] Un job qualité (Biome, types, tests), puis les images poussées en `sha-<court>` et `latest`.
- [ ] Qualité en moins de 5 minutes : `gh run list -R AI-Sisters/gds --limit 3 --json conclusion,createdAt,updatedAt`.
- [ ] Secrets du dépôt posés :
  ```bash
  for k in REGISTRY_URL REGISTRY_USERNAME REGISTRY_PASSWORD; do
    python3 scripts/coffre.py valeur registre/ovh $k | gh secret set OVH_$k -R AI-Sisters/gds
  done
  security find-generic-password -s discord-alertes -w | gh secret set DISCORD_ALERTES_WEBHOOK -R AI-Sisters/gds
  ```
- [x] Aucune construction sur le serveur : `deploy/compose.prod.yml` n'a que des `image:`.

## 3. Déploiement

- [ ] VM `gds` joignable (`ssh gds true`), sudo sans mot de passe, Docker installé (rôle `socle`).
- [ ] root connecté au registre OVH sur la VM (une fois) :
  `python3 scripts/coffre.py valeur registre/ovh REGISTRY_PASSWORD | ssh gds "sudo docker login -u '<REGISTRY_USERNAME>' --password-stdin w2943q64.eu-west-par.container-registry.ovh.net"`.
- [ ] Coffre `secret/gds/prod` rempli avec les clés de `deploy/.env.example` (mots de passe et `AUTH_SECRET` générés, jamais réutilisés).
- [ ] DNS : `gds.aisisters.ai` pointe vers la VM (ports 80 et 443 ouverts) avant le premier `make deploy`.
- [x] `make deploy` / `make deploy TAG=sha-xxxxxxx` : CI verte exigée, `.env` depuis le coffre, sauvegarde avant, migrations, attente de la santé, retour arrière, trace du déploiement dans GitHub.
- [x] Compose de prod dans le dépôt (`compose.yml` et `deploy/compose.prod.yml`), images au SHA (étiquette `deploy-<id>`), ports sur `127.0.0.1` sauf Caddy.
- [ ] `.env` en 600 : `ssh gds 'sudo ls -la /opt/gds/.env'` donne `-rw-------`.

## 4. Santé et suivi

- [x] `/health`, `/health/ready`, `/version` : `curl -fsS https://gds.aisisters.ai/health/ready && curl -fsS https://gds.aisisters.ai/version`.
- [ ] Projet(s) GlitchTip et DSN dans le coffre : `~/aisisters/aisisters-infra/scripts/glitchtip-projet.sh gds-web javascript-nextjs` (clé `SENTRY_DSN_WEB`) et `glitchtip-projet.sh gds-worker node` (clé `SENTRY_DSN_WORKER`).
- [ ] Sonde Gatus sur `https://gds.aisisters.ai/health/ready` : `ansible/roles/outils/defaults/main.yml` d'aisisters-infra, groupe `clients`.
- [ ] VM dans l'inventaire `fleet` (groupe `clients`) avec `backup_pg: [gds-db]` et `backup_paths: [/opt/gds/.env]` ; socle, mises à jour automatiques, sondes de machine.

## 5. Données et IA

- [x] PostgreSQL 17 sur la VM (conteneur `gds-db`, réseau interne).
- [ ] Sauvegarde horaire hors cloud active et restauration hebdomadaire testée (runbook `sauvegardes` d'aisisters-infra).
- [x] LLM en Europe : Bedrock `eu-west-3`. [ ] Clés AWS dédiées au client dans le coffre (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) et en secrets du dépôt pour les contrats.
- [x] Workflow `contrats` chaque nuit, alerte dans `#alertes`. [ ] Un test par API tierce ajoutée ; aucun test ignoré faute de secret (résumé du run).

## 6. Comptes

- [ ] Realm Keycloak `client-gds` (thème du client) dans aisisters-apps, `keycloak/clients/gds.yml`, avec le client confidentiel `gds-web` (redirection `https://gds.aisisters.ai/api/auth/callback/keycloak`, déconnexion vers `https://gds.aisisters.ai`), secret dans le coffre (`AUTH_KEYCLOAK_SECRET`) : `curl -fsS https://auth.agents.aisisters.ai/realms/client-gds/.well-known/openid-configuration`.
- [ ] `connexion_aisisters: true` dans ce realm : l'équipe AI Sisters entre par son compte (fournisseur `aisisters`) et devient `owner` dans l'application (claim `identity_provider` du jeton d'accès) ; tout autre compte est `membre`.

## Vérifier le projet

```bash
gh run list -R AI-Sisters/gds --limit 3        # CI verte, sur aisisters-ci
curl -fsS https://gds.aisisters.ai/health/ready            # santé
curl -fsS https://gds.aisisters.ai/version                 # SHA déployé
ssh gds 'sudo ls -la /opt/gds/.env'     # -rw-------
```
