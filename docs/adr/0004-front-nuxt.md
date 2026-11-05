# 0004 : front en Nuxt plutôt qu'en Next

## Contexte

Le template de mission (ADR 0001) pose le web en Next.js 16 (App Router, React 19, Auth.js, shadcn/ui, Sentry). L'intervenant unique de la mission est plus à l'aise sur l'écosystème Vue et Nuxt, et préfère y écrire la suite du produit. Les épics restants (connecteur CIRIL, échéances, avances, indices, préremplissage CCAP, tableau de bord, reprise du stock, baselines, rapprochement factures) sont essentiellement des pages d'application derrière la même base PostgreSQL.

## Décision

Le web passe en Nuxt 4 (Vue 3, Nitro). Tout ce qui tourne autour reste inchangé : monorepo pnpm et Turborepo, PostgreSQL 17 avec Drizzle dans `packages/db` partagé web et worker, worker pg-boss, images construites par la CI et poussées au registre OVH, déploiement par `make deploy`, secrets dans le coffre OpenBao, erreurs dans GlitchTip, sondes Gatus, LLM Bedrock Europe.

Correspondances retenues :

- Auth.js (Keycloak) remplacé par `nuxt-auth-utils` en flux OIDC côté serveur, session chiffrée dans un cookie, jetons Keycloak dans la session serveur seule.
- Composants shadcn/ui remplacés par `shadcn-vue` (même design système, mêmes primitives Radix côté Vue).
- Routes `app/api/**` et actions serveur remplacées par `server/api/**` de Nitro.
- Sentry via `@sentry/nuxt` (module officiel), `/health`, `/health/ready` et `/version` conservés à l'identique.
- `apps/web/lib/llm.ts` reste la seule porte vers le SDK AI (Vercel AI SDK), appelé depuis `server/`.

## Conséquences

- Le projet diverge de `AI-Sisters/template-mission`. `uvx copier update` continue à passer sur l'infra et le worker, mais les mises à jour du front du template ne s'appliquent plus automatiquement : chaque update sera relue à la main et les évolutions pertinentes recopiées.
- Si un deuxième projet veut repartir d'un front Nuxt, le socle se stabilisera d'abord ici, puis un `template-mission` variante `nuxt` pourra être extrait dans aisisters-apps. Hors scope de cette mission.
- La règle « SDK LLM cantonné à `apps/web/lib/llm.ts` » (CLAUDE.md) devient « cantonné à `apps/web/server/utils/llm.ts` ». L'override Biome et le test de contrat sont mis à jour.
- Le port de dev reste `3000` par défaut d'Auth.js côté template ; le projet utilise `9999` pour laisser `3000` à d'autres apps du poste.
