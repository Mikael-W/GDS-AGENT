#!/usr/bin/env bash
set -euo pipefail

commande=$(jq -r '.tool_input.command // ""')

case "$commande" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

branche=$(printf '%s' "$commande" | grep -oE '(feat|fix|chore|refactor|test|docs)/[A-Za-z0-9._/-]+' | tail -1 || true)
branche=${branche:-$(git branch --show-current 2>/dev/null || true)}

case "$branche" in
  feat/* | fix/* | chore/* | refactor/* | test/* | docs/*) ;;
  *) exit 0 ;;
esac

repere="$(git rev-parse --git-common-dir)/revue-${branche//\//-}"

if [ -e "$repere" ]; then
  exit 0
fi

touch "$repere"

jq -n --arg branche "$branche" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Fin de ticket sur la branche " + $branche + ". Invoquer maintenant le skill reviews-treatment : il lance la revue experte (skill revue-expert) dans un sous-agent, juge chaque constat, applique les pertinents et dialogue avec le relecteur jusqu a validation. Les tests du ticket font partie de la revue : ils doivent decrire le comportement metier en Given When Then, avec Arrange Act Assert dans chaque Then. Pousser ensuite les corrections, sans relancer de revue.")
  }
}'
