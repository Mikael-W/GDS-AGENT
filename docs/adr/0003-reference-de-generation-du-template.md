# 0003 : génération depuis `HEAD` du template, et non depuis `v0.2.0`

## Contexte

Le projet est généré depuis `AI-Sisters/template-mission`. L'étiquette la plus récente au moment de la génération est `v0.2.0`.

`v0.2.0` ne contient ni `packages/db` ni `apps/worker` : la base partagée Drizzle et le worker pg-boss arrivent dans un commit postérieur non étiqueté (`898b903`). Or cette mission repose entièrement sur du travail de fond planifié : synchronisation nocturne de CIRIL, calcul des échéances, recalcul des indices. Sans worker, il faudrait le reconstruire à la main, puis le jeter à la première mise à jour du template.

## Décision

Le projet est généré depuis `HEAD` du template, soit `v0.2.0-3-g7deac8d`. La référence exacte est inscrite dans `.copier-answers.yml` (`_commit`), que Copier relit pour les mises à jour.

`_src_path` est réécrit vers `https://github.com/AI-Sisters/template-mission.git`. Copier l'avait rempli avec le chemin du clone local, qui n'existe que sur le poste de génération et casserait `copier update` ailleurs.

## Conséquences

- `uvx copier update --trust` fonctionne depuis n'importe quel clone.
- La référence de départ n'est pas une version publiée : un diff de mise à jour peut contenir des changements déjà présents ici. Les relire plutôt que les appliquer en aveugle.
- À demander à AI Sisters : une étiquette `v0.2.1` sur `7deac8d`, pour que les prochaines missions partent d'une version nommée.
