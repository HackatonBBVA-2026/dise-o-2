"""Pruebas del dataset y del clasificador. Uso:  python -m unittest discover -s ml -v"""
import unittest

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score

from entrenar import particiones
from generar_dataset import Generador, controles_calidad
from modelo import baseline_ambito, baseline_categoria, crear_modelo, es_generica, preparar


def dataset_chico(semilla=42):
    return Generador(semilla).generar(n_persona=12, n_empresa=10)


class TestDataset(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = dataset_chico()

    def test_es_reproducible_con_la_misma_semilla(self):
        pd.testing.assert_frame_equal(self.df, dataset_chico())

    def test_otra_semilla_da_otros_datos(self):
        self.assertFalse(self.df["monto"].equals(dataset_chico(semilla=7)["monto"]))

    def test_pasa_controles_de_calidad(self):
        resumen = controles_calidad(self.df)
        self.assertEqual(resumen["usuarios"], 22)
        self.assertEqual(resumen["desde"], "2026-05-01")

    def test_incluye_casos_dificiles(self):
        d = self.df
        ayudante = d[d.categoria == "Pago a ayudante"]
        self.assertTrue(len(ayudante) > 0 and ayudante.descripcion.str.startswith("TRANSF A").all())
        mayorista = d[d.descripcion.str.startswith("MEGAMAYORISTA")]
        self.assertEqual(set(mayorista.ambito), {"negocio", "personal"})
        self.assertTrue(es_generica(d.descripcion).any(), "debe haber descripciones casi vacías")


class TestParticiones(unittest.TestCase):
    def test_sin_fuga_temporal_ni_de_usuarios(self):
        df = dataset_chico()
        parts = {n: (tr, te) for n, tr, te in particiones(df)}
        tr, te = parts["temporal"]
        self.assertLess(tr.fecha.max(), te.fecha.min())
        tr, te = parts["usuarios_nuevos"]
        self.assertFalse(set(tr.usuario_id) & set(te.usuario_id))
        self.assertLess(tr.fecha.max(), te.fecha.min())


class TestModelo(unittest.TestCase):
    def test_baseline_casos_conocidos(self):
        desc = pd.Series(["PAGO QR DE ROSA Q", "DISTRIBUIDORA ANDINA SAC", "STREAMFLIX.COM", "TRANSF A JUAN P", "ALGO RARO"])
        self.assertEqual(list(baseline_categoria(desc)), ["Ventas", "Mercaderia", "Suscripciones", "Transferencias", "Sin regla"])
        self.assertEqual(list(baseline_ambito(desc)), ["negocio", "negocio", "personal", "personal", "personal"])

    def test_descripciones_genericas(self):
        self.assertEqual(list(es_generica(pd.Series(["PAGO QR", " TRANSF ", "PAGO QR DE ANA S"]))), [True, True, False])

    def test_modelo_supera_al_baseline(self):
        df = Generador(3).generar(n_persona=25, n_empresa=20)
        _, train, test = next(particiones(df))
        for tarea, base in (("ambito", baseline_ambito), ("categoria", baseline_categoria)):
            tr = train[train.perfil == "empresa"] if tarea == "ambito" else train
            te = test[test.perfil == "empresa"] if tarea == "ambito" else test
            modelo = crear_modelo().fit(preparar(tr), tr[tarea])
            f1_modelo = f1_score(te[tarea], modelo.predict(preparar(te)), average="macro")
            f1_base = f1_score(te[tarea], base(te.descripcion), average="macro")
            with self.subTest(tarea=tarea):
                self.assertGreater(f1_modelo, f1_base)

    def test_probabilidades_validas(self):
        df = dataset_chico()
        emp = df[df.perfil == "empresa"]
        modelo = crear_modelo().fit(preparar(emp), emp.ambito)
        proba = modelo.predict_proba(preparar(emp.head(50)))
        np.testing.assert_allclose(proba.sum(axis=1), 1.0, rtol=1e-6)


if __name__ == "__main__":
    unittest.main()
