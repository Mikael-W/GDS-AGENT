#!/usr/bin/env bash
# Met des images en service sur la VM. Si elles ne démarrent pas (santé non
# atteinte, migration en échec), les images précédentes sont remises en place
# et le script échoue.
#
# Lancé par scripts/deploy.sh (`make deploy`), en root, avec des images déjà
# présentes sur la VM et étiquetées par leur identifiant (étiquette qui ne
# bouge pas quand `latest` avance). À la main, pour revenir à une version
# encore présente sur la VM (une image par service de projet.conf) :
#   sudo bash <dossier>/deploy.sh IMAGE_<SERVICE>=<image> ...
#
# Une migration n'est jamais annulée : en cas de retour arrière après une
# migration, restaurer la sauvegarde prise juste avant (RUNBOOK.md).
set -euo pipefail
cd "$(dirname "$0")"
umask 077

# shellcheck source=projet.conf
source ./projet.conf
attendues=()
for service in $SERVICES; do attendues+=("IMAGE_${service^^}"); done

[[ -f .env ]] || { echo ".env absent : passer par make deploy (coffre)" >&2; exit 1; }
chmod 600 .env
touch images.env

declare -A nouvelles=()
for arg in "$@"; do
  nom="${arg%%=*}"
  image="${arg#*=}"
  [[ " ${attendues[*]} " == *" $nom "* && -n "$image" ]] || { echo "Argument inattendu : $arg" >&2; exit 1; }
  docker image inspect "$image" >/dev/null 2>&1 || { echo "Image absente de la VM : $image" >&2; exit 1; }
  nouvelles[$nom]="$image"
done
for nom in "${attendues[@]}"; do
  [[ -n "${nouvelles[$nom]:-}" ]] || { echo "Usage : deploy.sh ${attendues[*]/%/=<image>}" >&2; exit 1; }
done

cp images.env images.env.precedent
{
  for nom in "${attendues[@]}"; do echo "$nom=${nouvelles[$nom]}"; done
} > images.env.nouveau

compose() { docker compose -f compose.yml -f compose.prod.yml --env-file .env --env-file "$1" "${@:2}"; }

demarrer() {
  compose "$1" up -d --remove-orphans --wait --wait-timeout 300
}

if ! demarrer images.env.nouveau; then
  compose images.env.nouveau logs --tail 80 >&2 || true
  if [[ -s images.env.precedent ]] && ! cmp -s images.env.precedent images.env.nouveau; then
    echo "La nouvelle version ne démarre pas : retour aux images précédentes" >&2
    demarrer images.env.precedent || echo "Le retour arrière n'a pas démarré non plus : voir RUNBOOK.md" >&2
  fi
  rm -f images.env.nouveau
  exit 1
fi
mv images.env.nouveau images.env

# Ménage : pour chaque image, on garde celle en service et la précédente.
for nom in "${attendues[@]}"; do
  courante="${nouvelles[$nom]}"
  precedente="$(sed -n "s/^$nom=//p" images.env.precedent)"
  docker images --format '{{.Repository}}:{{.Tag}}' "${courante%:*}" \
    | grep -vxF -e "$courante" -e "${precedente:-aucune}" -e "${courante%:*}:latest" \
    | xargs -r docker rmi >/dev/null 2>&1 || true
done

echo "En service :"
sed 's/^/  /' images.env
