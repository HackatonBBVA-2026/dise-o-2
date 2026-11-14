// Metas de gasto por categoría ("no gastar más de S/ 300 en Comida").
// Cada perfil tiene las suyas: la persona sobre sus categorías personales,
// el emprendedor sobre las de su negocio. Se guardan en memoria del servidor (demo).
import * as data from './data';
import { ESTADO_VACIO, clasificarTodos, resumenNegocio, resumenPersonal } from './clasificacion';
import { r2 } from './format';
import { memoria } from './memoria';
import type { Perfil } from './sesion';
import type { Alerta } from './types';

export interface MetaGasto { categoria: string; limite: number }
export type NivelMeta = 'ok' | 'en riesgo' | 'cerca' | 'superada';

const metas = memoria<Record<Perfil, MetaGasto[]>>('metasGasto', () => ({ persona: [], empresa: [] }));

const normalizar = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Categorías y gasto del mes según el perfil. */
export function categoriasDe(perfil: Perfil) {
  const movs = clasificarTodos(ESTADO_VACIO);
  return perfil === 'empresa' ? resumenNegocio(movs).categorias : resumenPersonal(movs).categorias;
}

function estado(perfil: Perfil, meta: MetaGasto) {
  const cat = categoriasDe(perfil).find((c) => normalizar(c.nombre) === normalizar(meta.categoria));
  const gastado = cat ? cat.monto : 0;
  const diasRestantes = data.cierreMes - data.hoy;
  const proyectadoFinDeMes = r2(gastado + (gastado / data.hoy) * diasRestantes); // mismo ritmo diario
  const pct = Math.round((gastado / meta.limite) * 100);
  const nivel: NivelMeta = pct >= 100 ? 'superada' : pct >= 80 ? 'cerca' : proyectadoFinDeMes > meta.limite ? 'en riesgo' : 'ok';
  return { ...meta, gastado, disponible: r2(meta.limite - gastado), pct, proyectadoFinDeMes, nivel };
}

export type EstadoMetaGasto = ReturnType<typeof estado>;

export function verMetas(perfil: Perfil) {
  return metas[perfil].map((m) => estado(perfil, m));
}

export function definirMeta(perfil: Perfil, categoria: unknown, limite: unknown) {
  const cat = categoriasDe(perfil).find((c) => normalizar(c.nombre) === normalizar(categoria));
  const monto = Number(limite);
  if (!cat) {
    return { ok: false as const, error: `No encontré la categoría "${String(categoria ?? '')}".`, categoriasValidas: categoriasDe(perfil).map((c) => c.nombre) };
  }
  if (!(monto > 0)) return { ok: false as const, error: 'El límite debe ser un monto mayor a 0.' };
  const lista = metas[perfil];
  const existente = lista.find((m) => m.categoria === cat.nombre);
  if (existente) existente.limite = monto;
  else lista.push({ categoria: cat.nombre, limite: monto });
  return { ok: true as const, meta: estado(perfil, { categoria: cat.nombre, limite: monto }) };
}

/** Avisos al 80%, al superarla o si al ritmo actual se pasaría a fin de mes. */
export function alertasMetas(perfil: Perfil): Alerta[] {
  return verMetas(perfil)
    .filter((m) => m.nivel !== 'ok')
    .map((m) => ({
      tipo: m.nivel === 'superada' ? 'peligro' : 'aviso',
      titulo:
        m.nivel === 'superada' ? `Superaste tu meta de ${m.categoria}`
        : m.nivel === 'cerca' ? `Estás cerca de tu meta de ${m.categoria}`
        : `Tu meta de ${m.categoria} está en riesgo`,
      corto: `Meta de ${m.categoria}`,
      texto: `Llevas S/ ${m.gastado} de S/ ${m.limite} (${m.pct}%). A este ritmo cerrarías el mes en S/ ${Math.round(m.proyectadoFinDeMes)}.`,
      pregunta: '¿Cómo van mis metas?',
    }));
}
