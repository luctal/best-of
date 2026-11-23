#!/usr/bin/env bash
# BO3 B : mutations de contrôle sur le choix du candidat. Sortie 0 = toutes mordent.
cd "$(dirname "$0")/.." || exit 2
R=0
m() { bash scripts/mutation.sh "$@" || R=1; }
m src/morceauxLogic.ts 's/Number\(b.recordType === .album.\) - Number\(a.recordType === .album.\)/0/' src/morceauxLogic.test.ts "choix : record_type album plus préféré"
m src/morceauxLogic.ts 's/Number\(estEdition\(a.titre\)\) - Number\(estEdition\(b.titre\)\)/0/' src/morceauxLogic.test.ts "choix : les éditions deluxe ne sont plus écartées"
m src/morceauxLogic.ts 's/if \(exacts.length === 1\)/if (exacts.length >= 1)/' src/morceauxLogic.test.ts "confiance : plusieurs exacts dits sûrs"
m src/morceauxLogic.ts 's/else if \(la !== null && lt !== null\)/else if (la !== null || lt !== null)/' src/morceauxLogic.test.ts "approche : un seul des deux voisin suffit"
exit $R
