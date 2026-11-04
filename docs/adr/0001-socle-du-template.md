# 0001. Socle du template de mission

Statut : acceptée, à la génération du projet (premier commit).

## Contexte

Les projets clients d'AI Sisters réinventaient chacun leur déploiement, leur CI et leur authentification. Le standard de maintenance (aisisters-infra, `docs/maintenance/standard.md`) fixe ce qu'un projet doit remplir.

## Décision

Le projet part du template `AI-Sisters/template-mission`, variante `next` : monorepo pnpm et Turborepo, web Next.js (TypeScript strict, Tailwind et shadcn/ui, Auth.js avec Keycloak côté serveur),
base PostgreSQL 17 gérée par Drizzle dans `packages/db`, partagée par le web et un worker pg-boss (files, tâches planifiées, battement contrôlé par `/health/ready`), rôles `membre` et `owner` recopiés de Keycloak à chaque connexion,
realm Keycloak `client-gds`, images construites par la CI et poussées au registre OVH, déploiement par `make deploy` depuis le poste de l'opérateur, secrets dans le coffre OpenBao, erreurs dans GlitchTip, sondes Gatus, LLM : `bedrock-eu`.

## Conséquences

- Les améliorations du template arrivent par `uvx copier update` ; s'écarter du template se fait en connaissance de cause et se note ici.
- Aucune construction sur la VM : elle ne fait que tirer des images.
