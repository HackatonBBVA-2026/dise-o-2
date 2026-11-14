"""Entrena y evalúa el clasificador de Mío contra el baseline de reglas.

Particiones (sin fuga de datos):
  1. temporal:         entrena con mayo-agosto y evalúa con septiembre-octubre.
  2. usuarios_nuevos:  además, el 25% de usuarios no se ve al entrenar (simula clientes nuevos).

Escribe resultados/metricas.json y resultados/reporte.md, y guarda los modelos en modelos/.
Uso:  python ml/entrenar.py
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from sklearn.model_selection import GroupShuffleSplit

from modelo import UMBRAL_CONFIANZA, baseline_ambito, baseline_categoria, crear_modelo, es_generica, preparar

AQUI = Path(__file__).resolve().parent
CORTE = "2026-09-01"


def cargar() -> pd.DataFrame:
    return pd.read_csv(AQUI / "datos" / "movimientos.csv", dtype={"rubro": str}, keep_default_na=False)


def particiones(df: pd.DataFrame):
    temporal_train = df["fecha"] < CORTE
    yield "temporal", df[temporal_train], df[~temporal_train]
    gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=7)
    idx_train_u, idx_test_u = next(gss.split(df, groups=df["usuario_id"]))
    usuarios_test = set(df.iloc[idx_test_u]["usuario_id"])
    es_test_u = df["usuario_id"].isin(usuarios_test)
    yield "usuarios_nuevos", df[temporal_train & ~es_test_u], df[~temporal_train & es_test_u]


def metricas(y_true, y_pred) -> dict:
    return {
        "f1_macro": round(float(f1_score(y_true, y_pred, average="macro", zero_division=0)), 4),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
    }


def evaluar_tarea(tarea: str, train: pd.DataFrame, test: pd.DataFrame) -> tuple[dict, object, pd.DataFrame]:
    if tarea == "ambito":  # solo emprendedores: con DNI todo es personal por definición
        train, test = train[train.perfil == "empresa"], test[test.perfil == "empresa"]
        pred_base = baseline_ambito(test["descripcion"])
    else:
        pred_base = baseline_categoria(test["descripcion"])

    t0 = time.time()
    modelo = crear_modelo().fit(preparar(train), train[tarea])
    seg = round(time.time() - t0, 1)
    proba = modelo.predict_proba(preparar(test))
    clases = modelo.classes_
    pred = clases[proba.argmax(axis=1)]
    confianza = proba.max(axis=1)
    solo_umbral = confianza >= UMBRAL_CONFIANZA
    seguro = solo_umbral & ~es_generica(test["descripcion"])  # política: descripciones genéricas siempre se confirman
    y = test[tarea].to_numpy()

    res = {
        "n_train": int(len(train)), "n_test": int(len(test)), "segundos_entrenamiento": seg,
        "baseline_reglas": metricas(y, pred_base),
        "modelo": metricas(y, pred),
        "f1_por_clase": {
            c: {"baseline": round(float(f1_score(y == c, pred_base == c, zero_division=0)), 3),
                "modelo": round(float(f1_score(y == c, pred == c, zero_division=0)), 3),
                "soporte": int((y == c).sum())}
            for c in sorted(set(y))
        },
        f"umbral_{UMBRAL_CONFIANZA}_sin_politica": {
            "cobertura": round(float(solo_umbral.mean()), 4),
            "accuracy_cuando_decide": round(float(accuracy_score(y[solo_umbral], pred[solo_umbral])), 4) if solo_umbral.any() else None,
        },
        f"umbral_{UMBRAL_CONFIANZA}": {
            "cobertura": round(float(seguro.mean()), 4),  # % que Boot clasifica solo
            "accuracy_cuando_decide": round(float(accuracy_score(y[seguro], pred[seguro])), 4) if seguro.any() else None,
            "va_a_por_clasificar": round(float(1 - seguro.mean()), 4),
        },
    }
    if tarea == "ambito":
        res["matriz_confusion"] = {"etiquetas": list(clases), "valores": confusion_matrix(y, pred, labels=clases).tolist()}

    errores = test.assign(prediccion=pred, confianza=confianza.round(2))[pred != y]
    return res, modelo, errores


def main():
    df = cargar()
    salida, modelos_dir = AQUI / "resultados", AQUI / "modelos"
    salida.mkdir(exist_ok=True)
    modelos_dir.mkdir(exist_ok=True)

    todo: dict = {"dataset": {"filas": int(len(df)), "usuarios": int(df.usuario_id.nunique()), "corte_temporal": CORTE}}
    ejemplos_error = {}
    for nombre, train, test in particiones(df):
        todo[nombre] = {}
        for tarea in ("ambito", "categoria"):
            res, modelo, errores = evaluar_tarea(tarea, train, test)
            todo[nombre][tarea] = res
            b, m = res["baseline_reglas"]["f1_macro"], res["modelo"]["f1_macro"]
            print(f"[{nombre}] {tarea:9s}  F1 macro  reglas={b:.3f}  modelo={m:.3f}  ({res['n_test']} movimientos de prueba)")
            if nombre == "temporal":
                joblib.dump(modelo, modelos_dir / f"clasificador_{tarea}.joblib")
                ejemplos_error[tarea] = errores.sort_values("confianza", ascending=False).head(12)

    (salida / "metricas.json").write_text(json.dumps(todo, ensure_ascii=False, indent=2), encoding="utf-8")
    escribir_reporte(todo, ejemplos_error, salida / "reporte.md")
    print(f"OK -> {salida / 'metricas.json'} y reporte.md")


def escribir_reporte(todo: dict, ejemplos: dict, ruta: Path):
    L = ["# Reporte de evaluación (generado por `ml/entrenar.py`)", "",
         f"Dataset sintético: {todo['dataset']['filas']:,} movimientos de {todo['dataset']['usuarios']} usuarios. "
         f"Entrenamiento: mayo-agosto 2026 · Prueba: septiembre-octubre 2026.", ""]
    for nombre, titulo in (("temporal", "Partición temporal"), ("usuarios_nuevos", "Usuarios nuevos (25% no vistos al entrenar)")):
        L += [f"## {titulo}", "", "| Tarea | Movimientos de prueba | F1 macro reglas | F1 macro modelo | Accuracy reglas | Accuracy modelo |", "|---|---|---|---|---|---|"]
        for tarea in ("ambito", "categoria"):
            r = todo[nombre][tarea]
            L.append(f"| {tarea} | {r['n_test']:,} | {r['baseline_reglas']['f1_macro']:.3f} | **{r['modelo']['f1_macro']:.3f}** | "
                     f"{r['baseline_reglas']['accuracy']:.3f} | {r['modelo']['accuracy']:.3f} |")
        L.append("")
    r = todo["temporal"]["ambito"]
    u = r[f"umbral_{UMBRAL_CONFIANZA}"]
    s = r[f"umbral_{UMBRAL_CONFIANZA}_sin_politica"]
    L += [f"## Umbral de confianza {UMBRAL_CONFIANZA} (ámbito, partición temporal)", "",
          f"- Solo con el umbral: Boot decide en el {s['cobertura']:.1%} de los movimientos, con accuracy de {s['accuracy_cuando_decide']:.2%}.",
          f"- Umbral + política (descripciones genéricas como `PAGO QR` siempre se confirman): decide en el **{u['cobertura']:.1%}**, "
          f"con accuracy de **{u['accuracy_cuando_decide']:.2%}**.",
          f"- El **{u['va_a_por_clasificar']:.1%}** va a \"Por clasificar\" para que el usuario confirme.", "",
          "Matriz de confusión del ámbito (filas = real, columnas = predicho):", "",
          "| | " + " | ".join(r["matriz_confusion"]["etiquetas"]) + " |", "|---" * (len(r["matriz_confusion"]["etiquetas"]) + 1) + "|"]
    for etq, fila in zip(r["matriz_confusion"]["etiquetas"], r["matriz_confusion"]["valores"]):
        L.append(f"| **{etq}** | " + " | ".join(f"{v:,}" for v in fila) + " |")
    L += ["", "## F1 por categoría (partición temporal)", "", "| Categoría | Soporte | Reglas | Modelo |", "|---|---|---|---|"]
    for c, v in todo["temporal"]["categoria"]["f1_por_clase"].items():
        L.append(f"| {c} | {v['soporte']:,} | {v['baseline']:.3f} | {v['modelo']:.3f} |")
    for tarea, ej in ejemplos.items():
        L += ["", f"## Errores del modelo con mayor confianza · {tarea}", "", "| Descripción | Monto | Real | Predicho | Confianza |", "|---|---|---|---|---|"]
        for _, f in ej.iterrows():
            L.append(f"| `{f['descripcion']}` | {f['monto']:.2f} | {f[tarea]} | {f['prediccion']} | {f['confianza']:.2f} |")
    ruta.write_text("\n".join(L) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
