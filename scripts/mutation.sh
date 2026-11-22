#!/usr/bin/env bash
# Mutation de contrôle : applique une substitution sed, joue un fichier de tests, restaure, et attend que les tests cassent.
# Usage : scripts/mutation.sh <fichier source> <expression sed> <fichier test> "<description>"
cd "$(dirname "$0")/.." || exit 2
F="$1"; E="$2"; T="$3"; D="$4"
cp "$F" "$F.orig"
sed -i -E "$E" "$F"
if cmp -s "$F" "$F.orig"; then mv "$F.orig" "$F"; echo "MUTATION SANS EFFET : $D"; exit 2; fi
SORTIE=$(npx vitest run "$T" 2>&1); CODE=$?
mv "$F.orig" "$F"
ECHECS=$(echo "$SORTIE" | grep -E "^ +Tests " | head -1)
if [ $CODE -ne 0 ]; then echo "MORD | $D | $ECHECS"; exit 0; else echo "NE MORD PAS | $D | $ECHECS"; exit 1; fi
