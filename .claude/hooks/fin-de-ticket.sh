#!/usr/bin/env bash
set -euo pipefail

commande=$(jq -r '.tool_input.command // ""')

case "$commande" in
  *"git push"*) ;;
  *) exit 0 ;;
esac

branche=$(git branch --show-current 2>/dev/null || true)

case "$branche" in
  feat/* | fix/* | chore/*) ;;
  *) exit 0 ;;
esac

repere="$(git rev-parse --git-dir)/revue-${branche//\//-}"

if [ -e "$repere" ]; then
  exit 0
fi

touch "$repere"

jq -n --arg branche "$branche" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: ("Fin de ticket sur la branche " + $branche + ". Invoquer maintenant le skill reviews-treatment : il lance la revue experte (skill revue-expert) dans un sous-agent, juge chaque constat, applique les pertinents et dialogue avec le relecteur jusqu a validation. Pousser ensuite les corrections, sans relancer de revue.")
  }
}'
