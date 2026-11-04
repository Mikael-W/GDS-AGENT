# RUNBOOK : Golfe de Saint-Tropez

Production : https://gds.aisisters.ai, VM `gds`, dossier `/opt/gds`. Formule de maintenance : F1.

Chaque fiche : symptôme, diagnostic, action, retour arrière. Toute action sur la prod passe par `make deploy` ; les commandes ci-dessous sont des lectures, sauf mention.

## Repères

| Quoi | Où |
|---|---|
| Santé | `curl -fsS https://gds.aisisters.ai/health/ready` (sonde Gatus, groupe `clients`) |
| Version en service | `curl -fsS https://gds.aisisters.ai/version` |
| Erreurs | GlitchTip, projet `gds-web` et `gds-worker` |
| Alertes | Discord `#alertes` (CI rouge, contrat d'API rompu, sonde en échec) |
| Secrets | coffre, `secret/gds/prod` (`python3 scripts/coffre.py comparer gds/prod gds /opt/gds/.env`) |
| Journaux | `ssh gds 'sudo docker logs --tail 200 gds-<service>'` (web, worker, migrations, db, caddy) |
| Sauvegardes | horaires et hors cloud par la VM (rôle `backup` d'aisisters-infra) ; avant chaque déploiement dans `/opt/gds/sauvegardes/` |

## Le site ne répond plus

- **Symptôme** : sonde Gatus rouge, `/health` en erreur ou délai dépassé.
- **Diagnostic** : `ssh gds 'sudo docker ps --format "{{.Names}} {{.Status}}"'` ; un conteneur `unhealthy` ou qui redémarre en boucle ; ses journaux. Disque plein : `df -h /`.
- **Action** : conteneur arrêté après un redémarrage de la VM : `make deploy TAG=<sha en service>` (relance le tout à l'identique). Disque plein : libérer hors Docker d'abord, puis `sudo docker image prune -af` (les images en service restent).
- **Retour arrière** : `make deploy TAG=sha-<version précédente>`.

## `/health/ready` en erreur, `/health` OK

- **Symptôme** : 503 sur `/health/ready`, le détail dit quel contrôle échoue.
- **Diagnostic** : `base` en erreur : `sudo docker logs gds-db --tail 100`. `planificateur` en erreur (aucun battement depuis 3 minutes) : le worker est arrêté ou bloqué, `sudo docker logs gds-worker --tail 100`. Connecteur tiers : son statut public, et le dernier run du workflow `contrats`.
- **Action** : base arrêtée ou worker arrêté : relancer par `make deploy TAG=<sha en service>`. Tiers en panne : attendre ou couper la fonctionnalité concernée, prévenir le client.
- **Retour arrière** : sans objet.

## Un déploiement a échoué

- **Symptôme** : `make deploy` s'arrête en erreur.
- **Diagnostic** : refus de la CI : la CI du commit n'est pas verte, la corriger. Échec de démarrage : `deploy.sh` a affiché les journaux et remis les images précédentes ; lire l'erreur (migration, réglage refusé en prod, secret absent du coffre).
- **Action** : corriger dans le dépôt, pousser, attendre la CI verte, redéployer. Secret manquant : l'ajouter au coffre (`secret/gds/prod`), jamais sur la VM.
- **Retour arrière** : automatique sur les images. Une migration déjà appliquée ne s'annule pas : si l'ancienne version ne supporte pas le nouveau schéma, restaurer la sauvegarde prise juste avant (fiche suivante).

## Restaurer la base

- **Symptôme** : données perdues ou corrompues, migration à défaire.
- **Diagnostic** : choisir la sauvegarde : `ssh gds 'sudo ls -lt /opt/gds/sauvegardes'` (avant déploiement) ou les sauvegardes horaires de la VM (runbook `sauvegardes` d'aisisters-infra).
- **Action** (écriture, sur demande explicite) : arrêter l'application, puis
  `sudo docker exec -i gds-db pg_restore -U app -d app --clean --if-exists < sauvegardes/<fichier>.dump`, puis `make deploy TAG=<sha compatible>`.
- **Retour arrière** : `sudo bash /opt/gds/sauvegarde.sh avant-restauration` AVANT de restaurer, pour pouvoir revenir.

## Certificat TLS expiré ou absent

- **Symptôme** : le navigateur signale un certificat invalide, `curl -v https://gds.aisisters.ai` échoue sur le TLS.
- **Diagnostic** : `ssh gds 'sudo docker logs gds-caddy --tail 100'` (échec ACME : DNS qui ne pointe plus vers la VM, ports 80 ou 443 fermés, limite de Let's Encrypt).
- **Action** : rétablir le DNS ou ouvrir les ports, puis `make deploy TAG=<sha en service>` (Caddy redemande le certificat au démarrage).
- **Retour arrière** : sans objet ; les certificats vivent dans le volume `caddy-donnees`, jamais supprimé.

## Erreurs en hausse dans GlitchTip

- **Symptôme** : alerte GlitchTip dans Discord.
- **Diagnostic** : version concernée (`release` = SHA) ; si elle suit un déploiement, comparer avec le précédent.
- **Action** : corriger ; en attendant, revenir à la version précédente si l'erreur bloque les utilisateurs.
- **Retour arrière** : `make deploy TAG=sha-<précédent>`.

## Contrat d'API tierce rompu

- **Symptôme** : message du workflow `contrats` dans `#alertes`.
- **Diagnostic** : le résumé du run dit quel champ ou quel code a changé.
- **Action** : adapter le client et son test de contrat, puis relancer le workflow à la main.
- **Retour arrière** : sans objet.

## Sous-traitants

| Service | Usage | Région |
|---|---|---|
| Hébergeur de la VM `gds` | application et base | Europe |
| Registre OVH | images | eu-west-par |
| Keycloak AI Sisters | comptes | Europe |
| AWS Bedrock | appels LLM | eu-west-3 (Paris) |

Tout nouveau fournisseur (LLM hors Europe, envoi de mails, API tierce recevant des données client) s'ajoute ici avant sa mise en service.
