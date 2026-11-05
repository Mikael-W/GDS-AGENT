# 0002 : une branche par ticket, revue le vendredi

## Contexte

Le template pose le commit direct sur `main` (ADR 0001, `CLAUDE.md`), adapté à un arbre partagé par plusieurs sessions sur une mission courte.

Sur cette mission, le développement est tenu par un seul intervenant et la recette passe par AI Sisters avant d'être montrée au client. Le commit direct sur `main` ne laisse aucun point de relecture : une brique entière arrive d'un bloc, sans diff lisible, et un retour en arrière oblige à défaire des commits mélangés.

## Décision

Un ticket, une branche, une demande de fusion.

- Nommage : `<type>/<sujet-court>`, avec les types de Conventional Commits (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`).
- `main` ne reçoit que des fusions. Aucun commit direct, y compris pour un correctif d'une ligne.
- Les demandes de fusion sont relues et fusionnées le vendredi, par lot. Une branche vit donc au plus une semaine : au-delà, elle est découpée.
- La branche est supprimée après fusion. Le kanban garde la trace, pas les branches mortes.
- Les règles du template qui ne portent pas sur `main` restent inchangées : messages en français `type(portée): sujet`, `git add <fichiers>` et jamais `git add -A`, aucun secret dans Git.

## Conséquences

- `CLAUDE.md` est corrigé : la règle du commit direct est remplacée, pas doublée. Zéro legacy s'applique aussi aux règles.
- La CI tourne sur chaque branche et sur `main`. Une branche rouge n'est pas fusionnée.
- Le lot du vendredi peut produire des conflits entre branches ouvertes en parallèle. Ils se résolvent dans la branche, jamais sur `main`.
- Le délai de fusion décale la mise en production d'une brique terminée en début de semaine. Accepté : la relecture vaut le délai.
