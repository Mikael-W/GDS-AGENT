#!/usr/bin/env bash
# Déploie le projet sur sa VM (deploy/projet.conf), depuis le poste de
# l'opérateur. Jamais lancé par la CI.
#
#   make deploy                    # images `latest` (dernier main vert)
#   make deploy TAG=sha-1a2b3c4    # une version précise, ou un retour arrière
#
# Déroulé :
#   1. refus si la CI du commit visé n'est pas verte (SKIP_CI_CHECK=1 : urgence) ;
#   2. copie de compose.yml et de deploy/ (surcouche de prod, Caddyfile,
#      projet.conf, deploy.sh, sauvegarde.sh) ;
#   3. .env de la VM réécrit depuis le coffre (secret/<client>/prod), en 600 ;
#   4. root tire les images et les étiquette par leur identifiant : `latest`
#      avance, cette étiquette non, ce qui permet le retour arrière ;
#   5. sauvegarde de la base juste avant, puis deploy.sh : migrations, mise en
#      service, attente de la santé, retour aux images précédentes sinon ;
#   6. contrôle de /version sur la VM, trace du déploiement dans GitHub.
#
# Prérequis (une fois) : docs/passage-en-maintenance.md.
set -euo pipefail

TAG="${1:-latest}"
RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=../deploy/projet.conf
source "$RACINE/deploy/projet.conf"
HOTE="${HOTE_DEPLOIEMENT:-$HOTE}"
read -r -a SERVICES <<<"$SERVICES"

[[ "$TAG" == "latest" || "$TAG" =~ ^sha-[0-9a-f]{7,40}$ ]] || {
  echo "TAG attendu : latest ou sha-<commit court> (reçu : $TAG)" >&2; exit 1; }

# 1. CI verte pour le commit déployé ----------------------------------------
command -v gh >/dev/null || { echo "gh introuvable (brew install gh)" >&2; exit 1; }
if [[ "$TAG" == "latest" ]]; then
  filtre='.[0]'
else
  filtre="map(select(.headSha | startswith(\"${TAG#sha-}\"))) | .[0]"
fi
run=$(gh run list -R "$DEPOT" --workflow ci.yml --branch main --limit 50 \
  --json status,conclusion,headSha,url --jq "$filtre // empty")
SHA=$(jq -r '.headSha // empty' <<<"${run:-null}")
if [[ "${SKIP_CI_CHECK:-}" == "1" ]]; then
  echo "→ Contrôle CI ignoré (SKIP_CI_CHECK=1)"
elif [[ -z "$run" ]]; then
  echo "ERREUR : aucune CI de main trouvée pour $TAG" >&2; exit 1
elif [[ "$(jq -r '"\(.status) \(.conclusion)"' <<<"$run")" != "completed success" ]]; then
  echo "ERREUR : la CI de ${SHA:0:7} n'est pas verte : $(jq -r '"\(.status) \(.conclusion)\n         \(.url)"' <<<"$run")" >&2
  echo "         Attendre qu'elle passe, ou SKIP_CI_CHECK=1 en cas d'urgence." >&2
  exit 1
else
  echo "→ CI verte pour ${SHA:0:7}"
fi
if [[ -z "$SHA" && "$TAG" != "latest" ]]; then
  SHA=$(gh api "repos/$DEPOT/commits/${TAG#sha-}" --jq .sha 2>/dev/null || true)
fi

echo "→ Déploiement de $NOM_AFFICHE"
echo "    images : $REGISTRE/$CLIENT-{$(IFS=,; echo "${SERVICES[*]}")}:$TAG"
echo "    VM     : $HOTE:$DOSSIER"

# 2. Fichiers de déploiement -------------------------------------------------
echo "→ Copie de compose.yml et deploy/"
deploiement=(compose.prod.yml Caddyfile projet.conf deploy.sh sauvegarde.sh)
fichiers=(compose.yml "${deploiement[@]}")
# Variables développées sur le poste, à dessein (SC2029).
# shellcheck disable=SC2029
tar -cf - -C "$RACINE" compose.yml -C "$RACINE/deploy" "${deploiement[@]}" \
  | ssh "$HOTE" "sudo mkdir -p '$DOSSIER' && sudo tar -C '$DOSSIER' -xf - --no-same-owner \
      && cd '$DOSSIER' && sudo chown root:root ${fichiers[*]}"

# 3. .env depuis le coffre ---------------------------------------------------
echo "→ .env depuis le coffre (secret/$CLIENT/prod)"
python3 "$RACINE/scripts/coffre.py" deposer "$CLIENT/prod" "$HOTE" "$DOSSIER/.env"

# 4 et 5. Images, sauvegarde, mise en service --------------------------------
# Pas de `docker exec -i` dans ce bloc : il avalerait la suite, lue sur
# l'entrée standard.
ssh "$HOTE" sudo bash -s -- "$TAG" "$DOSSIER" <<'DISTANT'
set -euo pipefail
tag=$1
cd "$2"
source ./projet.conf
args=()
for service in $SERVICES; do
  depot="$REGISTRE/$CLIENT-$service"
  echo "→ docker pull $depot:$tag"
  docker pull -q "$depot:$tag" >/dev/null
  id=$(docker image inspect --format '{{.Id}}' "$depot:$tag" | cut -d: -f2 | cut -c1-12)
  docker tag "$depot:$tag" "$depot:deploy-$id"
  args+=("IMAGE_${service^^}=$depot:deploy-$id")
done
bash sauvegarde.sh avant-deploiement
bash deploy.sh "${args[@]}" </dev/null
DISTANT

# 6. Vérification et trace ---------------------------------------------------
# shellcheck disable=SC2029
deploye=$(ssh "$HOTE" "curl -fsS $URL_VERSION" | jq -r '.sha // empty')
echo "→ /version : ${deploye:-inconnue}"
if [[ -n "$SHA" && "$deploye" != "${SHA:0:7}" ]]; then
  echo "ATTENTION : la version en service (${deploye:-?}) n'est pas le commit attendu (${SHA:0:7})." >&2
  SHA=$(gh api "repos/$DEPOT/commits/$deploye" --jq .sha 2>/dev/null || true)
fi

# Trace pour le compte rendu mensuel. Un échec ici n'annule rien.
if [[ -n "$SHA" ]] && id=$(gh api -X POST "repos/$DEPOT/deployments" -f ref="$SHA" \
      -f environment=production -F auto_merge=false -F 'required_contexts[]' --jq .id 2>/dev/null) \
    && gh api -X POST "repos/$DEPOT/deployments/$id/statuses" -f state=success \
      -f environment_url="https://$DOMAINE" >/dev/null 2>&1; then
  echo "→ Déploiement enregistré dans GitHub (${SHA:0:7})"
else
  echo "Avertissement : déploiement non enregistré dans GitHub (compte rendu mensuel à compléter à la main)." >&2
fi

echo ""
echo "Déployé. Vérifier https://$DOMAINE/health/ready"
