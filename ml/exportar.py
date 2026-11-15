"""Exporta el clasificador de ámbito (negocio / personal) a JSON para que la app lo ejecute sin Python.

La app (frontend/lib/ml/ambito.ts) repite exactamente el mismo preprocesamiento de scikit-learn:
TF-IDF de caracteres (char_wb 2-5, sublinear) + TF-IDF de palabras + log del monto + one-hot,
y aplica la regresión logística. También escribe casos de prueba con las probabilidades de Python
para comprobar que la app da lo mismo.

Uso:  python ml/exportar.py      (después de python ml/entrenar.py)
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from modelo import UMBRAL_CONFIANZA, preparar

AQUI = Path(__file__).resolve().parent
DESTINO = AQUI.parent / "frontend" / "lib" / "ml"


def vectorizador(v) -> dict:
    vocab = sorted(v.vocabulary_.items(), key=lambda kv: kv[1])
    assert [i for _, i in vocab] == list(range(len(vocab)))
    return {
        "analizador": v.analyzer,
        "ngramas": list(v.ngram_range),
        "minusculas": bool(v.lowercase),
        "patron": v.token_pattern if v.analyzer == "word" else None,
        "tf_sublineal": bool(v.sublinear_tf),
        "terminos": [t for t, _ in vocab],
        "idf": [round(float(x), 6) for x in v.idf_],
    }


def main():
    modelo = joblib.load(AQUI / "modelos" / "clasificador_ambito.joblib")
    f = modelo.named_steps["features"]
    clf = modelo.named_steps["clasificador"]
    oh = f.named_transformers_["categoricas"]
    columnas_oh = ["medio", "dia_semana", "tramo_mes", "perfil", "rubro"]
    assert list(oh.feature_names_in_) == columnas_oh

    export = {
        "version": 1,
        "tarea": "ambito",
        "umbral": UMBRAL_CONFIANZA,
        "clases": list(clf.classes_),
        "chars": vectorizador(f.named_transformers_["texto_chars"]),
        "palabras": vectorizador(f.named_transformers_["texto_palabras"]),
        "numericas": ["log_monto", "es_ingreso"],
        "categoricas": {c: [str(x) for x in cats] for c, cats in zip(columnas_oh, oh.categories_)},
        "coef": [round(float(x), 6) for x in clf.coef_[0]],
        "intercepto": round(float(clf.intercept_[0]), 6),
    }
    DESTINO.mkdir(parents=True, exist_ok=True)
    (DESTINO / "modelo-ambito.json").write_text(json.dumps(export, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # Casos de prueba: 300 movimientos reales del dataset + los de la demo, con la probabilidad de Python.
    df = pd.read_csv(AQUI / "datos" / "movimientos.csv", dtype={"rubro": str}, keep_default_na=False)
    muestra = df[df.perfil == "empresa"].sample(300, random_state=11)
    proba = modelo.predict_proba(preparar(muestra))[:, list(clf.classes_).index("negocio")]
    casos = [
        {"descripcion": r.descripcion, "monto": float(r.monto), "medio": r.medio, "fecha": r.fecha,
         "perfil": r.perfil, "rubro": r.rubro, "p_negocio": round(float(p), 6)}
        for r, p in zip(muestra.itertuples(), proba)
    ]
    (AQUI / "resultados" / "casos_prueba_ambito.json").write_text(json.dumps(casos, ensure_ascii=False), encoding="utf-8")
    kb = (DESTINO / "modelo-ambito.json").stat().st_size // 1024
    print(f"Modelo exportado: {DESTINO / 'modelo-ambito.json'} ({kb} KB, {len(export['coef'])} características)")
    print(f"Casos de prueba: {len(casos)} en resultados/casos_prueba_ambito.json")


if __name__ == "__main__":
    main()
