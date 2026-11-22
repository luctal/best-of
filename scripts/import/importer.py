#!/usr/bin/env python3
"""Import de l'historique Excel best-of vers albums.csv et meilleurs.csv.

Usage : python3 importer.py CHEMIN_DU_XLSX [DOSSIER_SORTIE]
Dépendance : openpyxl. Le xlsx ne doit jamais entrer dans le dépôt.
Sortie : albums.csv, meilleurs.csv (séparateur ;, UTF-8), puis un tableau de décompte.
"""
import csv
import datetime
import json
import os
import re
import sys
import unicodedata

COLONNES = ["annee", "artiste", "album", "deezer_album_id", "coeurs", "morceaux",
            "score", "note", "date_ecoute", "rang_historique", "format_source",
            "donnees_brutes", "a_verifier"]

MOIS = {
    "jan": 1,
    "janv": 1,
    "janvier": 1,
    "fev": 2,
    "fevr": 2,
    "fevrier": 2,
    "mar": 3,
    "mars": 3,
    "av": 4,
    "avr": 4,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juil": 7,
    "juillet": 7,
    "aou": 8,
    "aout": 8,
    "sep": 9,
    "sept": 9,
    "septembre": 9,
    "oct": 10,
    "octobre": 10,
    "nov": 11,
    "novembre": 11,
    "dec": 12,
    "decembre": 12,
}

IGNORES = {"global 2010-2020"}


def nettoyer(v):
    """Chaîne vide ou espaces -> None ; texte rogné ; entier flottant -> int."""
    if v is None:
        return None
    if isinstance(v, str):
        v = v.strip()
        return v or None
    if isinstance(v, float) and v == int(v):
        return int(v)
    return v


def nombre(v):
    """Renvoie (valeur numérique ou None, brut non numérique ou None)."""
    v = nettoyer(v)
    if v is None:
        return None, None
    if isinstance(v, bool):
        return None, v
    if isinstance(v, (int, float)):
        return v, None
    if isinstance(v, str):
        try:
            return nombre(float(v.replace(",", ".")))[0], None
        except ValueError:
            return None, v  # texte ou erreur de cache (#DIV/0!)
    return None, v


def _sans_accents(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def parse_date(v, annee_onglet=None):
    """Renvoie (AAAA-MM-01 ou None, statut).

    statut : 'vide', 'ok', 'annee_deduite' (texte sans année : année de l'onglet),
    'non_convertible'.
    """
    v = nettoyer(v)
    if v is None:
        return None, "vide"
    if isinstance(v, (datetime.datetime, datetime.date)):
        return "%04d-%02d-01" % (v.year, v.month), "ok"
    if not isinstance(v, str):
        return None, "non_convertible"
    t = _sans_accents(v).lower()
    m = re.match(r"^(?:(\d{1,2})[-\s./])?([a-z]+)\.?(?:[-\s./]?(\d{4}|\d{2}))?$", t)
    if not m or m.group(2) not in MOIS:
        return None, "non_convertible"
    mois = MOIS[m.group(2)]
    an = m.group(3)
    if an:
        an = int(an)
        if an < 100:
            an += 2000
        return "%04d-%02d-01" % (an, mois), "ok"
    if annee_onglet:
        return "%04d-%02d-01" % (int(annee_onglet), mois), "annee_deduite"
    return None, "non_convertible"


def format_source(onglet):
    n = int(onglet)
    if n in (2008, 2009):
        return "2008-2009"
    if 2010 <= n <= 2020:
        return "2010-2020"
    if 2023 <= n <= 2026:
        return "2023-2026"
    return str(n)


def _txt(v):
    v = nettoyer(v)
    return None if v is None else str(v)


def _ligne(annee, fmt, artiste, album, brut, a_verifier, ligne, **champs):
    brut = dict(brut)
    brut["ligne"] = ligne
    d = {c: None for c in COLONNES}
    d.update(annee=annee, artiste=artiste, album=album, format_source=fmt,
             donnees_brutes=brut, a_verifier=bool(a_verifier))
    d.update(champs)
    return d


def _ajoute_date(brut, v, annee):
    iso, statut = parse_date(v, annee)
    if statut in ("annee_deduite", "non_convertible"):
        brut["date_brute"] = v if isinstance(v, str) else str(v)
        if statut == "annee_deduite":
            brut["annee_deduite"] = True
    return iso, statut in ("annee_deduite", "non_convertible")


def _vide(cellules):
    return all(nettoyer(c) is None for c in cellules)


def lire_onglet(nom, lignes):
    """Lit les lignes (tuples de valeurs) d'un onglet ; renvoie (produites, nb_non_vides, meilleur, ignorees).

    nb_non_vides : lignes de données avec un artiste (en-tête de ligne 1 exclu pour 2010-2020).
    meilleur : valeur de I1 (formats 2023-2026), sinon None.
    ignorees : lignes sans artiste mais non vides (ignorées, décision de l'ordre).
    """
    if nom in IGNORES:
        return [], 0, None, 0
    annee = int(nom)
    fmt = format_source(nom)
    out, non_vides, meilleur, ignorees = [], 0, None, 0
    lignes = list(lignes)
    if 2010 <= annee <= 2020:
        debut = 1  # ligne 1 = en-tête
    else:
        debut = 0
    ordre = 0
    for idx in range(debut, len(lignes)):
        r = list(lignes[idx]) + [None] * 12
        ligne = idx + 1
        if annee == 2006:
            cells = r[:2]
        elif annee == 2007:
            cells = r[:1]
        elif annee in (2008, 2009):
            cells = r[:4]
        elif 2010 <= annee <= 2020:
            cells = r[:9]
        elif annee == 2021:
            cells = r[:4]
        elif annee == 2022:
            cells = r[:6]
        else:
            cells = r[:7]
        if _vide(cells):
            continue
        if nettoyer(r[1] if annee == 2006 else r[0]) is None:
            ignorees += 1
            continue
        non_vides += 1
        ordre += 1
        manque = False
        brut = {}
        if annee == 2006:
            rang, brut_rang = nombre(r[0])
            artiste = _txt(r[1])
            if rang is None:
                manque = True
                brut["rang_brut"] = _txt(r[0])
            out.append(_ligne(annee, fmt, artiste, None, brut, manque or artiste is None, ligne,
                              rang_historique=int(rang) if rang is not None else None))
        elif annee == 2007:
            artiste = _txt(r[0])
            out.append(_ligne(annee, fmt, artiste, None, brut, artiste is None, ligne,
                              rang_historique=ordre))
        elif annee in (2008, 2009):
            artiste = _txt(r[0])
            brut["x"] = _txt(r[1])
            for cle, v in (("titres_adores", r[2]), ("titres_pas_mal", r[3])):
                n, b = nombre(v)
                brut[cle] = n if n is not None else b
                if n is None:
                    manque = True
            out.append(_ligne(annee, fmt, artiste, None, brut, manque or artiste is None, ligne,
                              rang_historique=ordre))
        elif 2010 <= annee <= 2020:
            artiste, album = _txt(r[0]), _txt(r[1])
            if artiste is None or (annee != 2010 and album is None):
                manque = True
            for cle, v in (("top", r[2]), ("good", r[3]), ("not_bad", r[4]),
                           ("avis_general", r[5]), ("nbr_track", r[6])):
                n, b = nombre(v)
                brut[cle] = n if n is not None else b
                if n is None:
                    manque = True
            note, b = nombre(r[7])
            if note is None:
                manque = True
                if b is not None:
                    brut["note_brute"] = b
            iso = None
            if annee != 2010:
                iso, pb = _ajoute_date(brut, r[8], annee)
                if nettoyer(r[8]) is None or pb:
                    manque = True
            out.append(_ligne(annee, fmt, artiste, album, brut, manque, ligne,
                              note=note, date_ecoute=iso))
        else:  # 2021 à 2026
            artiste, album = _txt(r[0]), _txt(r[1])
            if artiste is None or album is None:
                manque = True
            coeurs, b = nombre(r[2])
            if coeurs is None:
                manque = True
                if b is not None:
                    brut["coeurs_brut"] = b
            if annee == 2021:
                iso, pb = _ajoute_date(brut, r[3], annee)
                if nettoyer(r[3]) is None or pb:
                    manque = True
                out.append(_ligne(annee, fmt, artiste, album, brut, manque, ligne,
                                  coeurs=coeurs, date_ecoute=iso))
                continue
            morceaux, b = nombre(r[3])
            if b is not None:
                brut["morceaux_brut"] = b
            score, b = nombre(r[4])
            if b is not None:
                brut["score_brut"] = b
            if annee == 2022:
                note = None
                date_v = r[5]
                # morceaux et score attendus seulement si au moins un cœur (décision Q4)
                if (coeurs or 0) > 0 and (morceaux is None or score is None):
                    manque = True
            else:
                note, b = nombre(r[6])
                if b is not None:
                    brut["note_brute"] = b
                date_v = r[5]
                if morceaux is None or score is None or note is None:
                    manque = True
            iso, pb = _ajoute_date(brut, date_v, annee)
            if nettoyer(date_v) is None or pb:
                manque = True
            out.append(_ligne(annee, fmt, artiste, album, brut, manque, ligne,
                              coeurs=coeurs, morceaux=morceaux, score=score,
                              note=note, date_ecoute=iso))
            if annee >= 2023 and ligne == 1:
                meilleur, _ = nombre(r[8])
    return out, non_vides, meilleur, ignorees


def _fmt_valeur(v):
    if v is None:
        return ""
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        return repr(v)
    return str(v)


def ecrire_albums(chemin, lignes):
    with open(chemin, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(COLONNES)
        for d in lignes:
            row = []
            for c in COLONNES:
                v = d[c]
                if c == "donnees_brutes":
                    v = json.dumps(v, ensure_ascii=False, sort_keys=True)
                row.append(_fmt_valeur(v))
            w.writerow(row)


def ecrire_meilleurs(chemin, meilleurs):
    with open(chemin, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(["annee", "meilleur_score"])
        for annee, v in meilleurs:
            w.writerow([annee, _fmt_valeur(v)])


def importer(xlsx, sortie):
    import openpyxl  # import tardif : les fonctions pures n'en ont pas besoin
    wb = openpyxl.load_workbook(xlsx, data_only=True)
    tous, meilleurs, tableau = [], [], []
    for nom in wb.sheetnames:
        if nom in IGNORES:
            tableau.append((nom, None, None, None, None, "non importé (compilation)"))
            continue
        lignes = [tuple(c for c in r) for r in wb[nom].iter_rows(values_only=True)]
        out, nv, meilleur, ign = lire_onglet(nom, lignes)
        if meilleur is not None:
            meilleurs.append((int(nom), meilleur))
        tous.extend(out)
        av = sum(1 for d in out if d["a_verifier"])
        tableau.append((nom, nv, len(out), av, ign, "ok" if nv == len(out) else "ÉCART"))
    os.makedirs(sortie, exist_ok=True)
    ecrire_albums(os.path.join(sortie, "albums.csv"), tous)
    ecrire_meilleurs(os.path.join(sortie, "meilleurs.csv"), meilleurs)
    return tableau


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    sortie = argv[2] if len(argv) > 2 else os.path.dirname(os.path.abspath(__file__))
    tableau = importer(argv[1], sortie)
    print("| onglet | non vides | produites | a_verifier | ignorées sans artiste | verdict |")
    print("|---|---|---|---|---|---|")
    for t in tableau:
        print("| " + " | ".join("" if x is None else str(x) for x in t) + " |")
    return 1 if any(t[5] == "ÉCART" for t in tableau) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
