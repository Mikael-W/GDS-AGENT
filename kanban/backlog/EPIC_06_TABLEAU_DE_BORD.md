# EPIC_06 : tableau de bord et digest

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

Une page unique donne l'état des marchés à suivre, et un envoi périodique le rappelle sans ouvrir l'application.

## Critères d'acceptation

- [ ] La page tient sur un écran sans défilement pour un portefeuille de 250 marchés.
- [ ] Chaque chiffre affiché est cliquable et mène à la liste qui le compose.
- [ ] Le digest reprend exactement ce que montre la page, sans chiffre recalculé ailleurs.
- [ ] La mise en forme du digest par un LLM, si elle est retenue, ne touche jamais aux chiffres.

## Étapes

- [ ] Front volontairement minimal tant que la direction visuelle n'est pas validée par le client : trois propositions sont en attente de son choix.
- [ ] Vues de synthèse en base, une requête par bloc.
- [ ] Digest par courriel, envoyé en local vers Mailpit.

## Décisions à prendre

- Choix de la direction visuelle parmi les trois propositions envoyées au PO : institutionnel, application claire, tableur augmenté.
- Fréquence du digest : hebdomadaire ou à chaque nouvelle alerte.

## Journal

| Date | Note |
|---|---|
| 2026-11-04 | Création. Le front reste nu jusqu'à la validation du template visuel. |
