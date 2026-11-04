# EPIC_04 : indices INSEE et révision de prix

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

Les équipes savent, pour chaque marché révisable, quand la révision est due et quel coefficient s'applique.

## Critères d'acceptation

- [ ] Les séries INSEE utilisées sont rafraîchies automatiquement et horodatées.
- [ ] Le coefficient affiché est reproductible : formule, valeurs d'indice, dates de référence, tout est montré.
- [ ] Un indice non encore publié ne bloque pas le calcul : la dernière valeur de référence connue est utilisée et signalée comme telle.
- [ ] Aucun appel LLM dans le calcul.

## Étapes

- [ ] Client du service SDMX de l'INSEE (`bdm.insee.fr`, sans authentification), séries TP01, FD, ING, ICC, ICHTrev-TS.
- [ ] Table `indices` historisée, rafraîchissement planifié tenant compte des délais de publication (M+45 pour BT et TP, T+75 pour ICHTrev-TS).
- [ ] Modèle de formule de révision par marché, saisi ou pré-rempli par l'épic 05.
- [ ] Calendrier de révision issu du CCAP, et alerte à l'échéance.

## Décisions à prendre

- Liste définitive des séries à suivre : dépend des formules réellement présentes dans les CCAP du stock.

## Journal

| Date | Note |
|---|---|
| 2026-11-04 | Création. Règle OECP 2023 retenue : dernière valeur de référence connue. |
