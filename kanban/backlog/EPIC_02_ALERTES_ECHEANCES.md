# EPIC_02 : alertes d'échéances

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

Les équipes marchés reçoivent, avant la date limite, la liste des marchés à reconduire, à réceptionner ou à relancer.

## Critères d'acceptation

- [ ] Les cinq familles d'alerte sont produites : reconduction, garanties, réception, point à six mois, absence de bon de commande.
- [ ] Chaque alerte porte la règle qui l'a déclenchée et les champs CIRIL qui l'alimentent, lisibles par l'utilisateur.
- [ ] Le calcul est entièrement déterministe : aucun appel LLM dans cette brique.
- [ ] Une alerte traitée ne revient pas le lendemain.

## Étapes

- [ ] Modèle des règles : fenêtre d'anticipation par famille, dates source (`VIM_DATDEB`, `VIM_DATFIN`, `VIM_DATNOT`), filtres (`VIM_ACTIF`, `VIM_MARSOL`).
- [ ] Moteur d'évaluation pur, testé par cas de table.
- [ ] Table `alertes` avec cycle de vie : ouverte, vue, traitée, écartée, et motif d'écartement.
- [ ] Écran liste avec filtres par famille, par échéance et par service.

## Décisions à prendre

- Fenêtres d'anticipation par famille : à faire valider par le PO et les utilisateurs finaux.
- Une absence de bon de commande sur un marché à bons de commande est-elle une alerte ou une information ?

## Journal

| Date | Note |
|---|---|
| 2026-11-04 | Création. |
