#!/bin/bash
# Mutation mordante : casse une règle dans une copie temporaire et exige que les tests échouent.
set -u
ici="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
muter() {  # $1 = motif sed
  cp "$ici/importer.py" "$ici/test_importer.py" "$tmp/"
  sed -i "$1" "$tmp/importer.py"
  if cmp -s "$ici/importer.py" "$tmp/importer.py"; then echo "mutation sans effet : $1"; exit 2; fi
  if python3 -m unittest discover -s "$tmp" -p 'test_importer.py' >/dev/null 2>&1; then
    echo "MUTANT SURVIVANT : $1"; exit 1
  fi
  echo "mutant tué : $1"
}
python3 -m unittest discover -s "$ici" -p 'test_importer.py' >/dev/null 2>&1 || { echo "tests rouges sans mutation"; exit 3; }
muter 's/"aou": 8,/"aou": 9,/'
muter 's/"%04d-%02d-01" % (v.year, v.month)/"%04d-%02d-15" % (v.year, v.month)/'
muter 's/(coeurs or 0) > 0 and/True and/'
muter 's/rang_historique=ordre))$/rang_historique=ordre + 1))/'
echo "mutations : tous tués"
