"""Clasificador de movimientos de Mío: baseline por reglas vs. modelo de ML.

Dos tareas:
  - `ambito`:    ¿el movimiento es del negocio o personal?  (solo emprendedores; con DNI todo es personal)
  - `categoria`: ¿en qué se gastó / de dónde vino?          (todos los usuarios)

Baseline: reglas por palabras clave, como las escribiría un desarrollador sin ML.
Modelo:   TF-IDF de caracteres y palabras de la descripción + monto, medio, día y perfil/rubro,
          con regresión logística. Devuelve probabilidades: bajo el umbral de confianza, la app
          no decide y manda el movimiento a "Por clasificar" (el usuario confirma).
"""
from __future__ import annotations

import re

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder

UMBRAL_CONFIANZA = 0.7  # el mismo que usa la app (lib/clasificacion.ts)

CATEGORIAS_NEGOCIO = {"Ventas", "Mercaderia", "Insumos", "Flete", "Alquiler local", "Servicios negocio", "Publicidad", "Pago a ayudante"}

# ---------- Baseline: reglas por palabra clave (en orden; gana la primera) ----------
REGLAS: list[tuple[str, str]] = [
    (r"PLANILLA|HABERES|TRANSF DE", "Ingreso"),
    (r"PAGO QR DE|DEPOSITO|ABONO VENTAS", "Ventas"),
    (r"DISTRIBUIDORA|LACTEOS|BEBIDAS|IMPORTADORA|GAMARRA|REPUESTOS|LUBRICANTES|AVICOLA|MAYORISTA PTO", "Mercaderia"),
    (r"EMPAQUES|BOLSAS|ETIQUETAS|FERRETERIA|DESCARTABLES|GAS DOMICILIO", "Insumos"),
    (r"TRANSPORTES|COURIER", "Flete"),
    (r"SOCIALADS", "Publicidad"),
    (r"ALQUILER LOCAL", "Alquiler local"),
    (r"ALQUILER DPTO", "Vivienda"),
    (r"NEGOCIO", "Servicios negocio"),
    (r"ENERLIMA|AGUALIMA|NETLIM|TELEMOVIL", "Servicios hogar"),
    (r"STREAMFLIX|MUSIPLAY|NUBE\+|GIMNASIO", "Suscripciones"),
    (r"SUPERMERCADO|MAXIAHORRO|MINIMARKET|POLLERIA|CHIFA|MENU|RAPIDOO|COMIDAYA|PANADERIA|MEGAMAYORISTA", "Comida"),
    (r"TAXIYA|MOVIRIDE|RECARGA TARJETA|GRIFO", "Transporte"),
    (r"BOTICA|CLINICA", "Salud"),
    (r"INSTITUTO|LIBRERIA", "Educacion"),
    (r"CINEMUNDO|JUEGOS|MODA", "Entretenimiento"),
    (r"TRANSF A|QR A", "Transferencias"),
]
_REGLAS = [(re.compile(p), c) for p, c in REGLAS]


# Descripciones sin comercio: no hay de dónde aprender, así que nunca se decide solo (va a "Por clasificar").
_GENERICA = re.compile(r"^(PAGO QR|COMPRA POS|TRANSF)$")


def es_generica(descripciones: pd.Series) -> np.ndarray:
    return np.array([bool(_GENERICA.match(str(d).strip())) for d in descripciones])


def baseline_categoria(descripciones: pd.Series) -> np.ndarray:
    def una(d: str) -> str:
        for patron, cat in _REGLAS:
            if patron.search(d):
                return cat
        return "Sin regla"
    return np.array([una(str(d)) for d in descripciones])


def baseline_ambito(descripciones: pd.Series) -> np.ndarray:
    return np.where(np.isin(baseline_categoria(descripciones), list(CATEGORIAS_NEGOCIO)), "negocio", "personal")


# ---------- Modelo ----------
def preparar(df: pd.DataFrame) -> pd.DataFrame:
    """Features que no dependen de la etiqueta (sin fuga de información)."""
    fecha = pd.to_datetime(df["fecha"])
    return pd.DataFrame({
        "descripcion": df["descripcion"].fillna("").astype(str),
        "log_monto": np.log1p(df["monto"].abs()),
        "es_ingreso": (df["monto"] > 0).astype(int),
        "medio": df["medio"].astype(str),
        "dia_semana": fecha.dt.dayofweek.astype(str),
        "tramo_mes": pd.cut(fecha.dt.day, [0, 5, 10, 20, 25, 31], labels=["1-5", "6-10", "11-20", "21-25", "26-31"]).astype(str),
        "perfil": df["perfil"].astype(str),
        "rubro": df["rubro"].fillna("").astype(str),
    })


def a_float(x: pd.DataFrame) -> np.ndarray:
    return x.to_numpy(dtype=float)


def crear_modelo(C: float = 5.0) -> Pipeline:
    columnas = ColumnTransformer([
        ("texto_chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), min_df=2, sublinear_tf=True), "descripcion"),
        ("texto_palabras", TfidfVectorizer(analyzer="word", token_pattern=r"[A-Z+]{2,}", lowercase=False, min_df=2), "descripcion"),
        ("numericas", FunctionTransformer(a_float), ["log_monto", "es_ingreso"]),
        ("categoricas", OneHotEncoder(handle_unknown="ignore"), ["medio", "dia_semana", "tramo_mes", "perfil", "rubro"]),
    ])
    return Pipeline([("features", columnas), ("clasificador", LogisticRegression(C=C, max_iter=3000))])
