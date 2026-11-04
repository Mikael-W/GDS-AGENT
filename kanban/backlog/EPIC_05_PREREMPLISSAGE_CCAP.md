# EPIC_05 : pré-remplissage assisté des CCAP

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

Déposer un CCAP ou un acte d'engagement remplit une proposition de fiche marché, que l'agent instructeur corrige et valide.

## Critères d'acceptation

- [ ] Rien n'est enregistré sans validation humaine : l'écran est un formulaire pré-rempli, pas un import.
- [ ] Chaque champ proposé cite l'extrait du document dont il vient, avec la page.
- [ ] Un champ non trouvé reste vide et le dit, il n'est jamais deviné.
- [ ] Les documents déposés ne sortent pas d'Europe (Bedrock `eu-west-3`) et ne sont pas conservés au-delà du besoin.

## Étapes

- [ ] Dépôt de fichier, extraction du texte et découpage par section.
- [ ] Prompt d'extraction dans `apps/web/prompts/`, jamais dans le code, sortie contrainte et validée par Zod.
- [ ] Écran de relecture champ par champ, avec l'extrait source en regard.
- [ ] Jeu d'évaluation sur des CCAP réels fournis par le PO, et mesure du taux de champs corrects.

## Décisions à prendre

- Durée de conservation des documents déposés : à arbitrer avec le DPO de la Communauté de communes.
- Volume de CCAP d'évaluation que le PO peut fournir, et sous quelle forme.

## Journal

| Date | Note |
|---|---|
| 2026-11-04 | Création. Seule brique où le LLM intervient, pour lire un document et proposer, jamais pour décider. |
