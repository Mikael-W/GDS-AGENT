# EPIC_01 : connecteur CIRIL en lecture seule et synchronisation quotidienne

> Statut : backlog · Mis à jour : 2026-11-04

## Objectif

L'application dispose chaque matin d'une copie à jour des marchés, engagements et factures de CIRIL, sans jamais écrire dans CIRIL.

## Critères d'acceptation

- [ ] Le compte de service CIRIL utilisé par l'application n'a aucun droit d'écriture : une tentative d'appel en écriture est refusée par CIRIL lui-même, pas seulement évitée par le code.
- [ ] `/health/ready` passe au rouge si la dernière synchronisation a plus de 26 heures.
- [ ] Une page d'administration affiche la date de la dernière synchronisation, le nombre de marchés lus et les écarts constatés depuis la veille.
- [ ] Les identifiants CIRIL ne sont nulle part dans Git ni dans un journal.

## Étapes

- [ ] Client SOAP dédié (un seul module, seul autorisé à sortir sur le réseau d'après `biome.json`), authentification par `AccessInfo/getAccessList`, chaîne de connexion mise en cache.
- [ ] Schéma Drizzle : `marches`, `lots`, `avenants`, `engagements`, `factures`, plus une table d'instantanés pour le calcul des écarts.
- [ ] Tâche pg-boss nocturne : instantané complet des marchés (150 à 250 lignes), diff local, puis lecture incrémentale des engagements et factures filtrée sur les dates métier.
- [ ] Refermer les synchronisations restées `en_cours` : au démarrage du worker, passer en `echec` (motif « interrompue ») toute ligne plus ancienne qu'un seuil, et refuser deux synchronisations en parallèle.
- [ ] Faire apparaître un échec récent dans le bandeau de fraîcheur : aujourd'hui seule la dernière lecture réussie est lue, une panne durable ressort comme « dernière lecture il y a N jours ».
- [ ] Tests de contrat contre le bac à sable (`apps/web/contrats/`), joués chaque nuit par `contrats.yml`.
- [ ] Validation Zod de chaque réponse CIRIL à la frontière.

## Décisions à prendre

- Compte CIRIL nominatif en lecture seule : à demander à la DSI de la Communauté de communes. Qui porte la demande, le PO ou AI Sisters ?
- Adresse IP de sortie fixe pour la VM de production et tunnel déclaré à la DSI : CIRIL authentifie aussi sur `REMOTE_ADDR`.

## Journal

| Date | Note |
|---|---|
| 2026-11-05 | Chaque synchronisation est journalisée, succès ou échec, avec un motif sans corps de réponse CIRIL. Étapes ajoutées : reprise des synchronisations interrompues, signal d'échec au bandeau. |
| 2026-11-04 | Création. Aucune date de dernière modification dans CIRIL : d'où l'instantané complet quotidien plutôt qu'un suivi des changements. |
