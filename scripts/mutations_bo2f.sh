#!/usr/bin/env bash
# BO2f : mutations de contrôle sur la relecture des cœurs. Sortie 0 = toutes mordent.
cd "$(dirname "$0")/.." || exit 2
R=0
m() { bash scripts/mutation.sh "$@" || R=1; }
m src/ecouteLogic.ts 's/const n = frais.get\(a.albumId\)/const n = a/' src/ecouteLogic.test.ts "enregistrement : cœurs périmés gardés au lieu des cœurs relus"
m src/ecouteLogic.ts 's/return \{ ok: false, message: MESSAGE_DEEZER_INJOIGNABLE \}/return { ok: true, albums: [...coches], absents: [], changements: [] }/' src/ecouteLogic.test.ts "Deezer injoignable : on enregistre quand même"
m src/ecouteLogic.ts 's/if \(o && o.coeurs !== n.coeurs\)/if (o \&\& o.coeurs === n.coeurs)/' src/ecouteLogic.test.ts "bilan : changement signalé quand rien ne change"
m src/ecouteLogic.ts 's/filter\(\(id\) => presents.has\(id\)\)/filter((id) => !presents.has(id))/' src/ecouteLogic.test.ts "actualiser : cases cochées perdues"
exit $R
