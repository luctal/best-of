#!/usr/bin/env bash
# Avant chaque commit : cherche dans les fichiers suivis (et ceux à committer) toute clé autre que la clé publique
# et tout motif de code admin. Sortie 0 = rien trouvé.
cd "$(dirname "$0")/.." || exit 2
FICHIERS=$( { git ls-files; git diff --cached --name-only; } | sort -u | grep -v -e '^package-lock.json$' -e '^scripts/controle_secrets.sh$')
P1='sb_secret_|service_'"role"'|eyJ[A-Za-z0-9_-]{20,}'
P2='sb_publishable_'
P3='(code_admin|codeAdmin|admin_code|p_code)[[:space:]]*[:=][[:space:]]*["'"'"'`][^"'"'"'`]+["'"'"'`]'
R=0
for f in $FICHIERS; do [ -f "$f" ] || continue
  grep -nE "$P1" "$f" && R=1
  grep -nE "$P3" "$f" && R=1
  grep -no "sb_publishable_[A-Za-z0-9_-]*" "$f" | grep -v 'sb_publishable_xJjf7GbfAQpFQKXYf4szQA_xVyoJ8G4' | grep . && R=1
done
[ $R = 0 ] && echo "controle secrets : rien trouve ($(echo "$FICHIERS" | wc -w) fichiers)" || echo "controle secrets : MOTIF TROUVE"
exit $R
