# EPIC_03 : alertes d'avance

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

Les équipes sont averties quand une avance versée atteint le seuil à partir duquel elle doit être récupérée.

## Critères d'acceptation

- [ ] Le cumul mandaté est calculé hors révision de prix.
- [ ] Les seuils de début et de fin de récupération sont paramétrables par marché, valeurs par défaut issues du CCAP.
- [ ] L'écran montre le détail du cumul : liste des mandatements retenus et des montants exclus, avec le motif.
- [ ] Aucun mandatement n'est déclenché par l'application.

## Étapes

- [ ] Lecture des mandatements (`dateMandatement`, `etatLiquidation`) et rattachement au marché.
- [ ] Calcul du cumul et de la part d'avance restant à récupérer.
- [ ] Règle de seuil et alerte associée, réutilisant le cycle de vie de l'épic 02.

## Décisions à prendre

- Traitement des avenants et des tranches dans le cumul : montant initial seul, ou montant notifié courant ?

## Journal

| Date | Note |
|---|---|
| 2026-11-04 | Création. |
