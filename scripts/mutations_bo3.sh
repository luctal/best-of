#!/usr/bin/env bash
# BO3 : mutations de contrôle sur les cœurs d'une autre version. Sortie 0 = toutes mordent.
cd "$(dirname "$0")/.." || exit 2
R=0
m() { bash scripts/mutation.sh "$@" || R=1; }
m src/ecouteLogic.ts 's/cles.has\(`\$\{normaliserNom\(t.artiste\)\}\|\$\{titre\}`\)/cles.has(`x|${titre}`)/' src/ecouteLogic.test.ts "autre version : l'artiste n'est plus comparé"
m src/ecouteLogic.ts 's/titre !== .. && cles.has/titre === "" \&\& cles.has/' src/ecouteLogic.test.ts "autre version : jamais appariée"
m src/ecouteLogic.ts 's/if \(ids.has\(t.id\)\) sortie.set\(t.id, .id.\)/if (ids.has(t.id)) sortie.set(t.id, "version")/' src/ecouteLogic.test.ts "même identifiant étiqueté autre version"
exit $R
