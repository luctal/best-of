import datetime
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importer as imp

D = datetime.datetime


class TestDates(unittest.TestCase):
    def test_datetime_au_premier_du_mois(self):
        self.assertEqual(imp.parse_date(D(2013, 10, 10), 2012), ("2013-10-01", "ok"))

    def test_textes_francais(self):
        for txt, att in [("Aou-18", "2018-08-01"), ("Juil-18", "2018-07-01"),
                         ("Mai-20", "2020-05-01"), ("Av-20", "2020-04-01"),
                         ("Nov20", "2020-11-01"), ("Fév-18", "2018-02-01"),
                         ("Déc-20", "2020-12-01"), ("Sep-18", "2018-09-01"),
                         ("Juin-18", "2018-06-01"), ("Oct-20", "2020-10-01")]:
            self.assertEqual(imp.parse_date(txt, 2000), (att, "ok"), txt)

    def test_texte_sans_annee_prend_annee_onglet(self):
        self.assertEqual(imp.parse_date("09-sept", 2011), ("2011-09-01", "annee_deduite"))

    def test_non_convertible_et_vide(self):
        self.assertEqual(imp.parse_date("bientôt", 2011), (None, "non_convertible"))
        self.assertEqual(imp.parse_date(None, 2011), (None, "vide"))
        self.assertEqual(imp.parse_date("  ", 2011), (None, "vide"))


class TestFormats(unittest.TestCase):
    def test_2006_rang_et_artiste(self):
        out, nv, _, ign = imp.lire_onglet("2006", [(1, "Beirut"), (2, "Fiery Furnaces")])
        self.assertEqual((nv, ign, len(out)), (2, 0, 2))
        self.assertEqual((out[1]["rang_historique"], out[1]["artiste"], out[1]["album"]), (2, "Fiery Furnaces", None))
        self.assertFalse(out[0]["a_verifier"])

    def test_2007_rang_par_ordre_en_sautant_les_vides(self):
        out, nv, _, _ = imp.lire_onglet("2007", [("A",), (None,), ("B",)])
        self.assertEqual([d["rang_historique"] for d in out], [1, 2])
        self.assertEqual(nv, 2)

    def test_2008_garde_x_et_nombres_dans_brut(self):
        out, _, _, _ = imp.lire_onglet("2008", [("Girls In Hawaii", "x", 4, 6), ("Fleet Foxes", None, 5, 4), ("Seul", None, None, None)])
        self.assertEqual(out[0]["donnees_brutes"]["x"], "x")
        self.assertEqual((out[0]["donnees_brutes"]["titres_adores"], out[0]["donnees_brutes"]["titres_pas_mal"]), (4, 6))
        self.assertIsNone(out[0]["note"])
        self.assertEqual(out[1]["rang_historique"], 2)
        self.assertFalse(out[0]["a_verifier"])
        self.assertTrue(out[2]["a_verifier"])

    def test_2010_en_tete_ignore_note_reprise_telle_quelle(self):
        lignes = [(None, None, "top", "good"), ("Puggy", None, 5, 6, 2, 3, 12, 17.4716, None, 2010)]
        out, nv, _, _ = imp.lire_onglet("2010", lignes)
        self.assertEqual(nv, 1)
        self.assertEqual(out[0]["note"], 17.4716)
        self.assertIsNone(out[0]["coeurs"])
        self.assertIsNone(out[0]["album"])
        self.assertFalse(out[0]["a_verifier"])  # 2010 : ni album ni mois attendus
        self.assertEqual(out[0]["donnees_brutes"]["top"], 5)

    def test_2011_mois_manquant_a_verifier(self):
        ent = (None,) * 9
        ok = ("A", "B", 5, 4, 1, 3, 10, 16.2, D(2011, 10, 10))
        sans_mois = ("C", "D", 5, 4, 1, 3, 10, 16.2, None)
        texte = ("E", "F", 5, 4, 1, 3, 10, 16.2, "zzz")
        out, _, _, _ = imp.lire_onglet("2011", [ent, ok, sans_mois, texte])
        self.assertEqual(out[0]["date_ecoute"], "2011-10-01")
        self.assertFalse(out[0]["a_verifier"])
        self.assertTrue(out[1]["a_verifier"])
        self.assertTrue(out[2]["a_verifier"])
        self.assertIsNone(out[2]["date_ecoute"])
        self.assertEqual(out[2]["donnees_brutes"]["date_brute"], "zzz")

    def test_2021_entier_est_coeurs_sans_a_verifier(self):
        out, _, _, _ = imp.lire_onglet("2021", [("Misophone", "X", 9, D(2021, 6, 1))])
        self.assertEqual((out[0]["coeurs"], out[0]["date_ecoute"], out[0]["format_source"]), (9, "2021-06-01", "2021"))
        self.assertIsNone(out[0]["morceaux"])
        self.assertFalse(out[0]["a_verifier"])

    def test_2022_morceaux_manquant_ne_signale_que_si_coeurs(self):
        lignes = [("A", "x", 10, 10, 1.58, D(2022, 2, 1)),
                  ("B", "y", 3, None, None, D(2022, 3, 1)),
                  ("C", "z", 0, None, None, D(2022, 4, 1))]
        out, _, _, _ = imp.lire_onglet("2022", lignes)
        self.assertEqual([d["a_verifier"] for d in out], [False, True, False])
        self.assertIsNone(out[0]["note"])

    def test_2023_note_meilleur_et_ligne_sans_artiste_ignoree(self):
        lignes = [("Sufjan", "Javelin", 10, 10, 1.58, D(2023, 10, 1), 19.9, "meilleure note", 1.59),
                  (None, None, None, None, None, None, 5.0),
                  (None,) * 9]
        out, nv, meilleur, ign = imp.lire_onglet("2023", lignes)
        self.assertEqual((len(out), nv, ign, meilleur), (1, 1, 1, 1.59))
        self.assertEqual(out[0]["note"], 19.9)

    def test_erreur_en_cache_donne_score_vide_et_a_verifier(self):
        out, _, _, _ = imp.lire_onglet("2024", [("A", "B", 0, 0, "#DIV/0!", D(2024, 1, 1), "#DIV/0!")])
        self.assertIsNone(out[0]["score"])
        self.assertIsNone(out[0]["note"])
        self.assertTrue(out[0]["a_verifier"])

    def test_global_non_importe(self):
        self.assertEqual(imp.lire_onglet("global 2010-2020", [("x",)]), ([], 0, None, 0))

    def test_format_source(self):
        self.assertEqual([imp.format_source(a) for a in ("2006", "2009", "2015", "2021", "2022", "2026")],
                         ["2006", "2008-2009", "2010-2020", "2021", "2022", "2023-2026"])


if __name__ == "__main__":
    unittest.main()
