#!/usr/bin/env bash
# Sauvegarde ponctuelle de la base dans sauvegardes/, au format custom de
# pg_dump (restauration : pg_restore --clean --if-exists -d app).
#
# Lancée par scripts/deploy.sh juste avant chaque déploiement, ou à la main :
#   sudo bash <dossier>/sauvegarde.sh [motif]
# Les sauvegardes horaires et la copie hors de la VM sont faites par la VM
# elle-même (rôle backup d'aisisters-infra), pas par ce script.
set -euo pipefail
cd "$(dirname "$0")"
umask 077

# shellcheck source=projet.conf
source ./projet.conf
conteneur="$CLIENT-db"
motif="${1:-manuelle}"

if ! docker ps --format '{{.Names}}' | grep -qx "$conteneur"; then
  echo "→ $conteneur ne tourne pas : rien à sauvegarder (premier déploiement ?)"
  exit 0
fi

mkdir -p sauvegardes
fichier="sauvegardes/base-$motif-$(date +%Y%m%d-%H%M%S).dump"
docker exec "$conteneur" pg_dump -U app -d app --format=custom > "$fichier.tmp"
mv "$fichier.tmp" "$fichier"
echo "→ Sauvegarde : $fichier ($(du -h "$fichier" | cut -f1))"

# On garde les 10 dernières sauvegardes de chaque motif.
find sauvegardes -maxdepth 1 -name "base-$motif-*.dump" -print0 \
  | xargs -0 ls -1t 2>/dev/null | tail -n +11 | xargs -r rm -f
