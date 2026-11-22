#!/usr/bin/env bash
# Une mutation mordante par jeu de tests. Chaque ligne : fichier source ; expression sed ; fichier de tests ; description.
# Sortie 0 = toutes mordent.
cd "$(dirname "$0")/.." || exit 2
R=0
m() { bash scripts/mutation.sh "$@" || R=1; }
m src/calculLogic.ts 's/coeurs \/ Math.pow\(morceaux, EXPOSANT\)/coeurs \/ Math.pow(morceaux, 0.5)/' src/calculLogic.test.ts "score : exposant 0,8 -> 0,5"
m src/calculLogic.ts 's/\(scoreAlbum \* 20\) \/ meilleur/(scoreAlbum * 10) \/ meilleur/' src/calculLogic.test.ts "note : sur 10 au lieu de 20"
m src/calculLogic.ts 's/Math.ceil\(scoreMax/Math.round(scoreMax/' src/calculLogic.test.ts "meilleur score : arrondi au plus proche au lieu du centième supérieur"
m src/calculLogic.ts 's/Math.min\(\.\.\.t\)/Math.max(...t)/' src/calculLogic.test.ts "date d'écoute : plus récente au lieu de la plus ancienne"
m src/calculLogic.ts 's/note > SEUIL_ROUGE|n > SEUIL_ROUGE/n >= SEUIL_ROUGE/' src/calculLogic.test.ts "règle du rouge : >= 10 au lieu de > 10"
m src/ecouteLogic.ts 's/const g = groupes.get\(t.albumId\)/const g = groupes.get(t.albumTitre as unknown as number)/' src/ecouteLogic.test.ts "regroupement : par titre au lieu de album.id"
m src/ecouteLogic.ts 's/\.sort\(\(a, b\) => a.premierAjout - b.premierAjout/.sort((a, b) => b.premierAjout - a.premierAjout/' src/ecouteLogic.test.ts "regroupement : plus récent d'abord"
m src/ecouteLogic.ts 's/replace\(\/\\\(\[\^\)\]\*\\\)\|\\\[\[\^\\\]\]\*\\\]\/g, . .\)/replace(\/\\(\\)\/g, " ")/' src/ecouteLogic.test.ts "filtre : mentions entre parenthèses non ignorées"
m src/ecouteLogic.ts 's/if \(index.ids.has\(a.albumId\)\) return .id./if (false) return "id"/' src/ecouteLogic.test.ts "filtre : identifiant Deezer ignoré"
m src/anneeLogic.ts "s/annee <= 2020 \? \['artiste', 'album', 'note', 'mois'\]/annee <= 2020 ? ['artiste', 'album', 'mois']/" src/anneeLogic.test.ts "colonnes : note retirée en 2010-2020"
m src/anneeLogic.ts "s/annee <= 2009 \? \['rang', 'artiste', 'adores', 'pas_mal'\]/annee <= 2009 ? ['rang', 'artiste', 'adores']/" src/anneeLogic.test.ts "colonnes : « pas mal » retirée en 2008-2009"
m src/anneeLogic.ts 's/const f = tri.sens === .asc. \? 1 : -1/const f = tri.sens === "asc" ? -1 : 1/' src/anneeLogic.test.ts "tri : sens inversé"
m src/exportLogic.ts 's/rouge: ligneRouge\(a\)/rouge: !ligneRouge(a)/' src/exportLogic.test.ts "export : rouge inversé"
m src/adminLogic.ts "s/format === 'appli' \|\| format === '2023-2026'/format === 'appli'/" src/adminLogic.test.ts "admin : 2023-2026 non recalculable"
m src/ecouteLogic.ts "s/timeZone: 'Europe\/Paris', year: 'numeric' \}\)\.format\(maintenant\)/timeZone: 'UTC', year: 'numeric' }).format(maintenant)/" src/ecouteLogic.test.ts "année proposée : fuseau UTC au lieu de Paris"
m src/exporter.ts "s/'FFFF0000'/'FF86193F'/" src/exporter.test.ts "export : rouge vif remplacé par le bordeaux"
[ $R = 0 ] && echo "TOUTES LES MUTATIONS MORDENT" || echo "AU MOINS UNE MUTATION NE MORD PAS"
exit $R
