"""Genera el dataset sintético de movimientos bancarios de Mío.

6 meses (mayo-octubre 2026) de movimientos de dos tipos de usuarios ficticios:
  - persona (entra con DNI): solo finanzas personales.
  - empresa (entra con RUC): emprendedor con una sola cuenta donde se mezclan
    movimientos del negocio y personales (el problema real que resuelve Mío).

Cada fila trae la descripción tal como aparecería en un extracto (mayúsculas, códigos,
truncada a 30 caracteres) y dos etiquetas: `categoria` y `ambito` (personal / negocio).
Todos los nombres de comercios y personas son ficticios. Semilla fija => reproducible.

Uso:  python ml/generar_dataset.py  [--usuarios-persona 90] [--usuarios-empresa 60] [--semilla 42]
"""
from __future__ import annotations

import argparse
import random
import string
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

AQUI = Path(__file__).resolve().parent
INICIO, FIN = date(2026, 5, 1), date(2026, 10, 31)
LARGO_EXTRACTO = 30  # los extractos bancarios truncan la descripción

NOMBRES = ["JUAN P", "ROSA Q", "CARLOS M", "LUCIA R", "MIGUEL T", "ANA S", "JORGE L", "CARMEN V", "LUIS F",
           "MARIA C", "PEDRO H", "SOFIA G", "DIEGO A", "ELENA B", "RAUL N", "PATRICIA O", "JOSE D", "VALERIA E"]

# Comercios ficticios por categoría personal: (plantilla, rango de monto en soles)
PERSONAL = {
    "Comida": [("SUPERMERCADO PLAZA {n}", (25, 260)), ("MAXIAHORRO {n}", (15, 180)), ("MINIMARKET 24H", (4, 45)),
               ("POLLERIA EL BRASERO", (25, 90)), ("CHIFA DRAGON DORADO", (20, 80)), ("MENU DONA LUCHA", (10, 18)),
               ("RAPIDOO*PEDIDO {c}", (18, 75)), ("COMIDAYA*{c}", (20, 70)), ("PANADERIA SAN JOSE", (3, 20))],
    "Transporte": [("TAXIYA*VIAJE {c}", (7, 35)), ("MOVIRIDE PE {c}", (6, 30)), ("RECARGA TARJETA BUS", (10, 50)),
                   ("GRIFO VIAPLUS {n}", (40, 180))],
    "Vivienda": [("ALQUILER DPTO {m}", (650, 1600))],
    "Servicios hogar": [("ENERLIMA RECIBO {c}", (45, 160)), ("AGUALIMA RECIBO {c}", (25, 80)),
                        ("NETLIM INTERNET HOGAR", (79, 129)), ("TELEMOVIL RECARGA", (10, 50))],
    "Suscripciones": [("STREAMFLIX.COM", (30, 45)), ("MUSIPLAY", (19.9, 24.9)), ("NUBE+ STORAGE", (9.9, 39.9)),
                      ("GIMNASIO FITZONE", (89, 139))],
    "Salud": [("BOTICA SALUD+ {n}", (12, 120)), ("CLINICA SAN MARTIN", (80, 350))],
    "Educacion": [("INSTITUTO CIBERTEC PENSION", (380, 650)), ("LIBRERIA CRISOL {n}", (20, 120))],
    "Entretenimiento": [("CINEMUNDO {n}", (18, 60)), ("JUEGOSONLINE*{c}", (10, 60)), ("TIENDA MODA URBANA", (60, 240))],
    "Transferencias": [("TRANSF A {nombre}", (20, 400)), ("QR A {nombre}", (5, 150))],
}

# Comercios ficticios del negocio por rubro: categoría -> [(plantilla, rango)]
NEGOCIO = {
    "bodega": {
        "Mercaderia": [("DISTRIBUIDORA ANDINA SAC", (250, 950)), ("LACTEOS DEL VALLE", (120, 420)),
                       ("BEBIDAS NORTE SAC", (150, 600)), ("MEGAMAYORISTA {n}", (180, 900))],
        "Insumos": [("EMPAQUES DEL NORTE", (30, 120)), ("BOLSAS Y MAS {n}", (20, 80))],
    },
    "redes": {
        "Mercaderia": [("IMPORTADORA LIMA CENTRO", (300, 1500)), ("GAMARRA TEXTIL {n}", (200, 900))],
        "Insumos": [("EMPAQUES DEL NORTE", (40, 160)), ("ETIQUETAS PRINT {n}", (30, 120))],
        "Publicidad": [("SOCIALADS*CAMPANA {c}", (30, 250))],
    },
    "taller": {
        "Mercaderia": [("REPUESTOS EL PISTON", (80, 600)), ("LUBRICANTES DEL SUR", (60, 350))],
        "Insumos": [("FERRETERIA EL MARTILLO", (20, 200))],
    },
    "comida": {
        "Mercaderia": [("MERCADO MAYORISTA PTO {n}", (150, 700)), ("MEGAMAYORISTA {n}", (150, 800)),
                       ("AVICOLA SAN FERNANDO", (120, 500))],
        "Insumos": [("DESCARTABLES LIMA", (40, 180)), ("GAS DOMICILIO {c}", (45, 60))],
    },
}
COMUNES_NEGOCIO = {
    "Flete": [("TRANSPORTES RAPIDO", (25, 90)), ("COURIER EXPRESS {c}", (12, 45))],
    "Alquiler local": [("ALQUILER LOCAL {m}", (500, 1800))],
    "Servicios negocio": [("ENERLIMA RECIBO {c}", (60, 280)), ("NETLIM INTERNET NEGOCIO", (89, 149))],
}

CATEGORIAS_NEGOCIO = {"Ventas", "Mercaderia", "Insumos", "Flete", "Alquiler local", "Servicios negocio", "Publicidad", "Pago a ayudante"}
MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"]


class Generador:
    def __init__(self, semilla: int):
        self.r = random.Random(semilla)
        self.np = np.random.default_rng(semilla)
        self.filas: list[dict] = []

    # ---------- utilidades ----------
    def codigo(self, k: int = 4) -> str:
        return "".join(self.r.choices(string.ascii_uppercase + string.digits, k=k))

    def desc(self, plantilla: str, fecha: date) -> str:
        texto = plantilla.format(n=self.r.randint(1, 99), c=self.codigo(), m=MESES[fecha.month - 1],
                                 nombre=self.r.choice(NOMBRES))
        if self.r.random() < 0.03:  # errores de tipeo del comercio
            i = self.r.randrange(len(texto))
            texto = texto[:i] + texto[i + 1:]
        if self.r.random() < 0.02:  # descripción casi vacía (caso difícil)
            texto = self.r.choice(["PAGO QR", "COMPRA POS", "TRANSF"])
        return texto[:LARGO_EXTRACTO]

    def monto(self, rango: tuple[float, float]) -> float:
        lo, hi = rango
        return round(self.r.uniform(lo, hi), 2)

    def agregar(self, u: dict, fecha: date, descripcion: str, monto: float, medio: str, categoria: str, ambito: str):
        self.filas.append({
            "usuario_id": u["id"], "perfil": u["perfil"], "rubro": u.get("rubro", ""), "fecha": fecha.isoformat(),
            "descripcion": descripcion, "monto": monto, "medio": medio, "categoria": categoria, "ambito": ambito,
        })

    def gasto(self, u: dict, fecha: date, catalogo: dict, categoria: str, ambito: str, medio: str | None = None):
        plantilla, rango = self.r.choice(catalogo[categoria])
        medio = medio or self.r.choice(["tarjeta", "tarjeta", "qr", "transferencia"])
        self.agregar(u, fecha, self.desc(plantilla, fecha), -self.monto(rango), medio, categoria, ambito)

    # ---------- vida personal (personas y también emprendedores) ----------
    def mes_personal(self, u: dict, anio: int, mes: int, escala: float):
        dias = dias_del_mes(anio, mes)
        # Ingreso: sueldo (persona) o retiro del negocio para la casa no aplica aquí; emprendedor no tiene planilla.
        if u["perfil"] == "persona":
            sueldo = round(u["sueldo"] * self.r.uniform(0.97, 1.03), 2)
            if u["quincenal"]:
                for d in (15, min(30, dias[-1].day)):
                    self.agregar(u, date(anio, mes, d), self.desc("ABONO PLANILLA {c} SAC", dias[0]), round(sueldo / 2, 2), "transferencia", "Ingreso", "personal")
            else:
                self.agregar(u, dias[0], self.desc("ABONO PLANILLA {c} SAC", dias[0]), sueldo, "transferencia", "Ingreso", "personal")
            if self.r.random() < 0.35:  # ingreso extra irregular (caso difícil)
                self.agregar(u, self.r.choice(dias), self.desc("TRANSF DE {nombre}", dias[0]), self.monto((100, 600)), "transferencia", "Ingreso", "personal")
        # Fijos del mes
        if u["alquila"]:
            self.gasto(u, date(anio, mes, 3), PERSONAL, "Vivienda", "personal", "transferencia")
        for _ in range(self.r.randint(2, 3)):
            self.gasto(u, date(anio, mes, self.r.randint(5, 26)), PERSONAL, "Servicios hogar", "personal", "debito")
        for sub in u["suscripciones"]:
            plantilla, rango = sub
            dia = date(anio, mes, u["dia_sub"])
            self.agregar(u, dia, plantilla[:LARGO_EXTRACTO], -round(sum(rango) / 2, 2), "tarjeta", "Suscripciones", "personal")
            if self.r.random() < 0.04:  # cobro duplicado (caso difícil)
                self.agregar(u, dia + timedelta(days=self.r.randint(1, 3)), plantilla[:LARGO_EXTRACTO], -round(sum(rango) / 2, 2), "tarjeta", "Suscripciones", "personal")
        if u["estudia"]:
            self.agregar(u, date(anio, mes, 10), "INSTITUTO CIBERTEC PENSION", -u["pension"], "transferencia", "Educacion", "personal")
        # Variables por día
        for d in dias:
            finde = d.weekday() >= 5
            for cat, prob in (("Comida", 0.75), ("Transporte", 0.55), ("Entretenimiento", 0.10 if not finde else 0.30),
                              ("Salud", 0.04), ("Transferencias", 0.10), ("Educacion", 0.02)):
                if self.r.random() < prob * escala:
                    self.gasto(u, d, PERSONAL, cat, "personal")

    # ---------- negocio (solo emprendedores) ----------
    def mes_negocio(self, u: dict, anio: int, mes: int):
        dias = dias_del_mes(anio, mes)
        rubro = NEGOCIO[u["rubro"]]
        for d in dias:
            if d.weekday() == 6 and u["rubro"] != "comida":
                continue  # muchos negocios no abren domingo
            base = u["ventas_dia"] * (1.35 if d.weekday() >= 4 else 1.0) * self.r.uniform(0.6, 1.4)
            # Cobros QR: pocos movimientos agregados por día (el banco agrupa); a veces depósito de efectivo
            for _ in range(self.r.randint(1, 4)):
                self.agregar(u, d, self.desc("PAGO QR DE {nombre}", d), round(base / 3 * self.r.uniform(0.3, 1.2), 2), "qr", "Ventas", "negocio")
            if self.r.random() < 0.18:
                self.agregar(u, d, self.desc("DEPOSITO AGENTE {c}", d), round(base * self.r.uniform(0.8, 2.5), 2), "deposito", "Ventas", "negocio")
            if u["pos"] and d.weekday() == 0:
                self.agregar(u, d, self.desc("ABONO VENTAS POS {c}", d), round(base * 2.2, 2), "transferencia", "Ventas", "negocio")
            # Compras del negocio
            if self.r.random() < u["frecuencia_compra"]:
                self.gasto(u, d, rubro, "Mercaderia", "negocio")
            if self.r.random() < 0.08:
                self.gasto(u, d, rubro, "Insumos", "negocio")
            if "Publicidad" in rubro and self.r.random() < 0.06:
                self.gasto(u, d, rubro, "Publicidad", "negocio", "tarjeta")
            if self.r.random() < 0.07:
                self.gasto(u, d, COMUNES_NEGOCIO, "Flete", "negocio")
            # Pago semanal al ayudante: mismo texto que una transferencia personal (caso difícil)
            if u["ayudante"] and d.weekday() == 5:
                self.agregar(u, d, f"TRANSF A {u['ayudante']}"[:LARGO_EXTRACTO], -u["pago_ayudante"], "transferencia", "Pago a ayudante", "negocio")
        if u["local_alquilado"]:
            self.gasto(u, date(anio, mes, 5), COMUNES_NEGOCIO, "Alquiler local", "negocio", "transferencia")
        for _ in range(2):
            self.gasto(u, date(anio, mes, self.r.randint(8, 25)), COMUNES_NEGOCIO, "Servicios negocio", "negocio", "debito")
        # Compras personales en el mismo mayorista que usa el negocio (caso difícil: mismo comercio, otro ámbito)
        if u["rubro"] in ("bodega", "comida"):
            for _ in range(self.r.randint(1, 3)):
                d = self.r.choice(dias)
                self.agregar(u, d, self.desc("MEGAMAYORISTA {n}", d), -self.monto((35, 160)), "tarjeta", "Comida", "personal")

    # ---------- usuarios ----------
    def usuario_persona(self, i: int) -> dict:
        return {"id": f"P{i:03d}", "perfil": "persona", "sueldo": self.r.choice([1130, 1500, 1800, 2400, 3200, 4500]) * self.r.uniform(0.9, 1.1),
                "quincenal": self.r.random() < 0.3, "alquila": self.r.random() < 0.55, "estudia": self.r.random() < 0.2,
                "pension": round(self.r.uniform(380, 650), 2), "dia_sub": self.r.randint(3, 25),
                "suscripciones": self.r.sample(PERSONAL["Suscripciones"], k=self.r.randint(0, 3))}

    def usuario_empresa(self, i: int) -> dict:
        rubro = self.r.choice(list(NEGOCIO))
        ayudante = self.r.choice(NOMBRES) if self.r.random() < 0.6 else None
        return {"id": f"E{i:03d}", "perfil": "empresa", "rubro": rubro, "ventas_dia": self.r.uniform(120, 650),
                "frecuencia_compra": self.r.uniform(0.08, 0.25), "pos": self.r.random() < 0.4, "local_alquilado": self.r.random() < 0.6,
                "ayudante": ayudante, "pago_ayudante": round(self.r.uniform(250, 450), 2),
                "alquila": self.r.random() < 0.4, "estudia": False, "pension": 0, "dia_sub": self.r.randint(3, 25),
                "suscripciones": self.r.sample(PERSONAL["Suscripciones"], k=self.r.randint(0, 2))}

    def generar(self, n_persona: int, n_empresa: int) -> pd.DataFrame:
        usuarios = [self.usuario_persona(i) for i in range(1, n_persona + 1)] + [self.usuario_empresa(i) for i in range(1, n_empresa + 1)]
        for u in usuarios:
            for anio, mes in meses_entre(INICIO, FIN):
                if u["perfil"] == "persona":
                    self.mes_personal(u, anio, mes, escala=1.0)
                else:
                    self.mes_negocio(u, anio, mes)
                    self.mes_personal(u, anio, mes, escala=0.55)  # el emprendedor gasta menos en lo personal por día
        df = pd.DataFrame(self.filas).sort_values(["usuario_id", "fecha"]).reset_index(drop=True)
        df.insert(0, "id", [f"M{i:06d}" for i in range(1, len(df) + 1)])
        return df


def dias_del_mes(anio: int, mes: int) -> list[date]:
    d = date(anio, mes, 1)
    out = []
    while d.month == mes:
        out.append(d)
        d += timedelta(days=1)
    return out


def meses_entre(a: date, b: date):
    y, m = a.year, a.month
    while (y, m) <= (b.year, b.month):
        yield y, m
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)


def controles_calidad(df: pd.DataFrame) -> dict:
    """Controles documentados en DATASET.md. Lanza AssertionError si algo no cuadra."""
    requeridas = ["id", "usuario_id", "perfil", "fecha", "descripcion", "monto", "medio", "categoria", "ambito"]
    assert df[requeridas].notna().all().all(), "hay valores vacíos en columnas requeridas"
    assert df["id"].is_unique, "ids repetidos"
    assert (df["monto"] != 0).all(), "montos en cero"
    assert set(df["ambito"]) <= {"personal", "negocio"}
    assert (df.loc[df["perfil"] == "persona", "ambito"] == "personal").all(), "una persona no puede tener movimientos de negocio"
    assert (df.loc[df["categoria"].isin(CATEGORIAS_NEGOCIO), "ambito"] == "negocio").all()
    ingresos = df["categoria"].isin(["Ingreso", "Ventas"])
    assert (df.loc[ingresos, "monto"] > 0).all() and (df.loc[~ingresos, "monto"] < 0).all(), "signo de monto inconsistente"
    return {
        "filas": int(len(df)), "usuarios": int(df["usuario_id"].nunique()),
        "personas": int(df.loc[df.perfil == "persona", "usuario_id"].nunique()),
        "emprendedores": int(df.loc[df.perfil == "empresa", "usuario_id"].nunique()),
        "desde": df["fecha"].min(), "hasta": df["fecha"].max(),
        "categorias": df["categoria"].value_counts().to_dict(),
        "ambito_emprendedores": df.loc[df.perfil == "empresa", "ambito"].value_counts().to_dict(),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--usuarios-persona", type=int, default=90)
    p.add_argument("--usuarios-empresa", type=int, default=60)
    p.add_argument("--semilla", type=int, default=42)
    p.add_argument("--salida", type=Path, default=AQUI / "datos" / "movimientos.csv")
    a = p.parse_args()
    df = Generador(a.semilla).generar(a.usuarios_persona, a.usuarios_empresa)
    resumen = controles_calidad(df)
    a.salida.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(a.salida, index=False, encoding="utf-8")
    print(f"OK {resumen['filas']} movimientos de {resumen['usuarios']} usuarios -> {a.salida}")
    print("Categorías:", resumen["categorias"])
    print("Ámbito (emprendedores):", resumen["ambito_emprendedores"])


if __name__ == "__main__":
    main()
