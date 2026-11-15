// Personal vs. negocio. Funciones puras: hoy corren en el navegador con datos ficticios;
// cuando exista el backend, este mismo cálculo se mueve allá y el frontend solo pinta.
import * as data from './data';
import { operaciones } from './operaciones';
import { r2 } from './format';
import { semaforo } from './finanzas';
import type { Ambito, Movimiento, ReglaComercio, Vista } from './types';

/** Lo que dijo el modelo de ML para un movimiento (lo calcula lib/ml/ia.ts en el servidor). */
export interface PrediccionIA { ambito: 'negocio' | 'personal'; confianza: number; decide: boolean; motivo?: string }
export type Predicciones = Record<string, PrediccionIA>;

/** En el servidor, lib/ml/ia.ts se registra aquí; en el navegador no existe y las predicciones llegan por props. */
export function prediccionesServidor(movs: Movimiento[]): Predicciones {
  const ia = (globalThis as typeof globalThis & { __mioIA?: (m: Movimiento[]) => Predicciones }).__mioIA;
  return ia ? ia(movs) : {};
}

/** Lo que el usuario cambió (hoy en localStorage; luego en el backend). */
export interface EstadoClasificacion {
  overrides: Record<string, { ambito: Ambito; pctNegocio?: number }>;
  reglasUsuario: ReglaComercio[];
  reglasEliminadas: string[]; // comercios cuya regla se borró
}

export const ESTADO_VACIO: EstadoClasificacion = { overrides: {}, reglasUsuario: [], reglasEliminadas: [] };

/** Por debajo de esta confianza Boot no decide: el movimiento va a "Por clasificar". */
export const UMBRAL_CONFIANZA = 0.7;

export type Origen = 'usuario' | 'regla' | 'boot' | 'pendiente';

export interface MovimientoClasificado extends Movimiento {
  efectivo: Ambito | null; // null = sin clasificar
  pct: number; // % que va a negocio (0, 100 o el de la división)
  origen: Origen;
  /** Lo que dijo el modelo de ML (si hay texto del banco). */
  ia?: PrediccionIA;
}

export function reglasActivas(e: EstadoClasificacion): ReglaComercio[] {
  const usuario = e.reglasUsuario.filter((r) => !e.reglasEliminadas.includes(r.comercio));
  const base = data.reglasBase.filter(
    (r) => !e.reglasEliminadas.includes(r.comercio) && !usuario.some((u) => u.comercio === r.comercio)
  );
  return [...usuario, ...base];
}

const pctDe = (ambito: Ambito, pct?: number) => (ambito === 'negocio' ? 100 : ambito === 'personal' ? 0 : pct ?? 50);

/** Prioridad: lo que marcó el usuario > regla por comercio > modelo de ML (si está seguro) > sin clasificar. */
export function clasificar(m: Movimiento, e: EstadoClasificacion, pred: Predicciones = {}): MovimientoClasificado {
  const ia = pred[m.id];
  const o = e.overrides[m.id];
  if (o) return { ...m, ia, efectivo: o.ambito, pct: pctDe(o.ambito, o.pctNegocio), origen: 'usuario' };

  const regla = reglasActivas(e).find((r) => r.comercio === m.descripcion);
  if (regla) return { ...m, ia, efectivo: regla.ambito, pct: pctDe(regla.ambito), origen: 'regla' };

  if (m.clasificadoPor === 'usuario') return { ...m, ia, efectivo: m.ambito, pct: pctDe(m.ambito, m.pctNegocio), origen: 'usuario' };

  // Modelo de ML: decide solo si está seguro; si no, el movimiento va a "Por clasificar" con su sugerencia.
  if (ia) {
    return ia.decide
      ? { ...m, ia, efectivo: ia.ambito, pct: pctDe(ia.ambito), origen: 'boot' }
      : { ...m, ia, efectivo: null, pct: 0, origen: 'pendiente' };
  }

  const dudoso = m.clasificadoPor === 'boot' && (m.confianza ?? 0) < UMBRAL_CONFIANZA;
  if (dudoso) return { ...m, efectivo: null, pct: 0, origen: 'pendiente' };

  return { ...m, efectivo: m.ambito, pct: pctDe(m.ambito, m.pctNegocio), origen: m.clasificadoPor === 'boot' ? 'boot' : 'usuario' };
}

/**
 * Movimientos del mes + las operaciones hechas desde la app (lo más reciente primero).
 * En el servidor las operaciones salen de la memoria; en el navegador llegan por `extra` desde el layout.
 */
export function clasificarTodos(e: EstadoClasificacion, extra: Movimiento[] = operaciones(), pred?: Predicciones) {
  const lista = [...extra, ...data.movimientos];
  const p = pred ?? prediccionesServidor(lista);
  return lista.map((m) => clasificar(m, e, p));
}

/** Parte del monto que corresponde a cada lado (0 si está sin clasificar). */
function partes(m: MovimientoClasificado) {
  if (m.efectivo === null) return { personal: 0, negocio: 0 };
  return { personal: m.monto * (1 - m.pct / 100), negocio: m.monto * (m.pct / 100) };
}

/** Lo que el resumen personal base ya contaba para este movimiento. */
function partesBase(m: Movimiento) {
  if (m.pendienteInicial) return { personal: 0, negocio: 0 };
  const pct = pctDe(m.ambito, m.pctNegocio);
  return { personal: m.monto * (1 - pct / 100), negocio: m.monto * (pct / 100) };
}

export interface CategoriaMonto { nombre: string; monto: number; pct: number; alerta?: boolean }

function conPct(cats: Map<string, number>, alertas: Set<string> = new Set()): CategoriaMonto[] {
  const lista = [...cats.entries()].filter(([, v]) => v > 0.005);
  const total = lista.reduce((a, [, v]) => a + v, 0) || 1;
  return lista
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, monto]) => ({ nombre, monto: r2(monto), pct: r2((monto / total) * 100), alerta: alertas.has(nombre) || undefined }));
}

/**
 * Resumen personal: el resumen base del mes + los ajustes por reclasificar.
 * Si una compra de stock se marca como personal, el gasto personal sube y la proyección baja.
 */
export function resumenPersonal(movs: MovimientoClasificado[], saldoActual = data.cuentas.reduce((a, c) => a + c.saldo, 0)) {
  let deltaIngresos = 0;
  let deltaGastos = 0;
  const cats = new Map(data.categorias.map((c) => [c.nombre, c.monto]));

  for (const m of movs) {
    const delta = partes(m).personal - partesBase(m).personal;
    if (Math.abs(delta) < 0.005) continue;
    if (m.monto > 0) deltaIngresos += delta;
    else {
      deltaGastos += -delta;
      const nombre = cats.has(m.categoria) ? m.categoria : 'Otros';
      cats.set(nombre, (cats.get(nombre) ?? 0) + -delta);
    }
  }

  const ingresos = r2(data.ingresosMes + deltaIngresos);
  const gastos = r2(data.gastosMes + deltaGastos);
  // Las operaciones ya salieron del saldo y también suben el gasto (deltaGastos): se suman de vuelta para no restarlas dos veces.
  const yaDescontado = movs.filter((m) => m.operacion).reduce((a, m) => a + partes(m).personal, 0);
  const proyeccionBase = r2(
    saldoActual - yaDescontado -
      data.proximosCobros.filter((c) => c.dia > data.hoy).reduce((a, c) => a + c.monto, 0) -
      data.gastoDiarioEstimado * (data.cierreMes - data.hoy)
  );
  const proyeccion = r2(proyeccionBase - deltaGastos + deltaIngresos);

  return {
    ingresos,
    gastos,
    neto: r2(ingresos - gastos),
    pctGasto: Math.min(100, Math.round((gastos / ingresos) * 100)),
    categorias: conPct(cats, new Set(data.categorias.filter((c) => c.alerta).map((c) => c.nombre))),
    proyeccion,
    semaforo: semaforo(proyeccion),
  };
}

/** Resumen del negocio: se calcula desde cero con los movimientos marcados como negocio. */
export function resumenNegocio(movs: MovimientoClasificado[]) {
  let ventas = 0;
  let mercaderia = 0;
  let otros = 0;
  const cats = new Map<string, number>();
  const compras: { dia: number; monto: number }[] = [];

  for (const m of movs) {
    const n = partes(m).negocio;
    if (Math.abs(n) < 0.005) continue;
    if (n > 0) ventas += n;
    else {
      const gasto = -n;
      cats.set(m.categoria, (cats.get(m.categoria) ?? 0) + gasto);
      if (m.categoria === 'Mercadería' || m.categoria === 'Compras mayoristas') {
        mercaderia += gasto;
        compras.push({ dia: m.dia, monto: gasto });
      } else otros += gasto;
    }
  }

  const resultado = r2(ventas - mercaderia - otros);
  return {
    ventas: r2(ventas),
    mercaderia: r2(mercaderia),
    otros: r2(otros),
    resultado,
    margenBruto: ventas ? Math.round(((ventas - mercaderia) / ventas) * 100) : 0,
    categorias: conPct(cats),
    reposicion: estimarReposicion(compras),
    estado: resultado < 0 ? { nivel: 'rojo' as const, texto: 'En pérdida' } : resultado < 150 ? { nivel: 'amarillo' as const, texto: 'Margen bajo' } : { nivel: 'verde' as const, texto: 'Rentable' },
  };
}

/** Cada cuántos días repone stock y cuándo sería la próxima compra (promedio de intervalos). */
export function estimarReposicion(compras: { dia: number; monto: number }[]) {
  const dias = [...new Set(compras.map((c) => c.dia))].sort((a, b) => a - b);
  if (dias.length < 2) return null;
  const intervalos = dias.slice(1).map((d, i) => d - dias[i]);
  const cada = Math.round(intervalos.reduce((a, b) => a + b, 0) / intervalos.length);
  const proxima = dias[dias.length - 1] + cada;
  const montoPromedio = Math.round(compras.reduce((a, c) => a + c.monto, 0) / dias.length);
  return { cada, proxima, montoPromedio, dias };
}

export const pendientes = (movs: MovimientoClasificado[]) => movs.filter((m) => m.efectivo === null);

/** Movimiento visible en una vista (los divididos aparecen en ambas). */
export function enVista(m: MovimientoClasificado, v: Vista | 'sin') {
  if (v === 'todo') return true;
  if (v === 'sin') return m.efectivo === null;
  if (m.efectivo === null) return false;
  return v === 'negocio' ? m.pct > 0 : m.pct < 100;
}
