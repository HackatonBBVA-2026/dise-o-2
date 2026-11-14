// Metas de ahorro y ofertas que se desbloquean al ahorrar, por perfil.
// Separar dinero para una meta lo descuenta del saldo disponible (simulación: no mueve dinero real).
// Estado en memoria del servidor (demo): se reinicia al reiniciar el servidor.
import * as data from './data';
import { ESTADO_VACIO, clasificarTodos, resumenNegocio } from './clasificacion';
import { r2 } from './format';
import { memoria } from './memoria';
import type { Perfil } from './sesion';
import type { Alerta } from './types';

export interface MetaAhorro { nombre: string; objetivo: number; ahorrado: number }
export interface Oferta { id: string; tipo: string; titulo: string; socio: string; requisito: number; beneficio: string }

const metas = memoria<Record<Perfil, MetaAhorro[]>>('metasAhorro', () => ({
  persona: [{ nombre: 'Viaje', objetivo: 1500, ahorrado: 650 }],
  empresa: [{ nombre: 'Refrigeradora nueva', objetivo: 1800, ahorrado: 450 }],
}));

// Ofertas y socios FICTICIOS. Se desbloquean al llegar a un monto ahorrado (suma de metas).
const OFERTAS: Record<Perfil, Oferta[]> = {
  persona: [
    { id: 'cine', tipo: 'Entretenimiento', titulo: '2 entradas de cine 2x1', socio: 'CineMundo (ficticio)', requisito: 300, beneficio: 'Paga 1 y lleva 2 entradas' },
    { id: 'paracas', tipo: 'Viaje', titulo: 'Fin de semana en Paracas', socio: 'Costa Sur Viajes (ficticio)', requisito: 800, beneficio: '15% de descuento en hotel + bus' },
    { id: 'cusco', tipo: 'Viaje', titulo: 'Paquete Cusco 3D/2N', socio: 'Andes Travel (ficticio)', requisito: 1500, beneficio: '20% de descuento y 6 cuotas sin intereses' },
    { id: 'tecno', tipo: 'Tecnología', titulo: 'Audífonos inalámbricos', socio: 'TecnoPlus (ficticio)', requisito: 2000, beneficio: 'S/ 80 de descuento' },
  ],
  empresa: [
    { id: 'pos', tipo: 'Cobros', titulo: 'POS sin comisión por 3 meses', socio: 'CobraFácil (ficticio)', requisito: 300, beneficio: '0% de comisión en ventas con tarjeta' },
    { id: 'curso', tipo: 'Capacitación', titulo: 'Curso de costos y precios', socio: 'Academia Emprende (ficticia)', requisito: 600, beneficio: 'Curso virtual gratis con certificado' },
    { id: 'refri', tipo: 'Equipamiento', titulo: 'Refrigeradora exhibidora', socio: 'FríoMax (ficticio)', requisito: 1500, beneficio: '20% de descuento y 12 cuotas sin intereses' },
    { id: 'feria', tipo: 'Ventas', titulo: 'Stand en feria de emprendedores', socio: 'Feria Lima Emprende (ficticia)', requisito: 2500, beneficio: 'Stand de 2 días a mitad de precio' },
  ],
};

const normalizar = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Cuánto podría separar al mes: la mitad de lo que le sobra (persona) o el 30% de la ganancia del negocio. */
export function ritmoMensual(perfil: Perfil) {
  if (perfil === 'persona') return Math.round(data.sobrantePromedio6m * 0.5);
  const ganancia = resumenNegocio(clasificarTodos(ESTADO_VACIO)).resultado;
  return Math.max(50, Math.round(Math.max(0, ganancia) * 0.3));
}

const buscar = (perfil: Perfil, nombre: unknown) => metas[perfil].find((m) => normalizar(m.nombre) === normalizar(nombre)) ?? null;

function estadoMeta(perfil: Perfil, m: MetaAhorro) {
  const falta = r2(Math.max(0, m.objetivo - m.ahorrado));
  return {
    ...m,
    falta,
    pct: Math.min(100, Math.round((m.ahorrado / m.objetivo) * 100)),
    cumplida: falta === 0,
    mesesEstimados: falta === 0 ? 0 : Math.ceil(falta / ritmoMensual(perfil)),
  };
}

export const totalAhorrado = (perfil: Perfil) => r2(metas[perfil].reduce((a, m) => a + m.ahorrado, 0));

export function verMetasAhorro(perfil: Perfil) {
  return { metas: metas[perfil].map((m) => estadoMeta(perfil, m)), totalAhorrado: totalAhorrado(perfil), ahorroSugeridoMensual: ritmoMensual(perfil) };
}

export function crearMetaAhorro(perfil: Perfil, nombre: unknown, objetivo: unknown) {
  const nom = String(nombre ?? '').trim().slice(0, 40);
  const obj = Number(objetivo);
  if (!nom) return { ok: false as const, error: 'Ponle un nombre a la meta.' };
  if (!(obj > 0)) return { ok: false as const, error: 'El objetivo debe ser un monto mayor a 0.' };
  const existente = buscar(perfil, nom);
  if (existente) existente.objetivo = obj;
  else metas[perfil].push({ nombre: nom, objetivo: obj, ahorrado: 0 });
  return { ok: true as const, meta: estadoMeta(perfil, buscar(perfil, nom)!) };
}

export function separarAhorro(perfil: Perfil, nombre: unknown, monto: unknown) {
  const meta = buscar(perfil, nombre);
  const m = Number(monto);
  const cuenta = data.cuentas[0];
  if (!meta) return { ok: false as const, error: `No tienes una meta de ahorro llamada "${String(nombre ?? '')}".`, metas: metas[perfil].map((x) => x.nombre) };
  if (!(m > 0)) return { ok: false as const, error: 'El monto debe ser mayor a 0.' };
  if (m > cuenta.saldo) return { ok: false as const, error: 'No tienes saldo suficiente para separar ese monto.' };

  const antes = new Set(verOfertas(perfil).ofertas.filter((o) => o.desbloqueada).map((o) => o.id));
  cuenta.saldo = r2(cuenta.saldo - m);
  meta.ahorrado = r2(meta.ahorrado + m);
  const nuevas = verOfertas(perfil).ofertas.filter((o) => o.desbloqueada && !antes.has(o.id));
  return { ok: true as const, meta: estadoMeta(perfil, meta), saldoDisponible: cuenta.saldo, ofertasNuevas: nuevas, aviso: 'Simulación: no se movió dinero real.' };
}

export function verOfertas(perfil: Perfil) {
  const total = totalAhorrado(perfil);
  const ritmo = ritmoMensual(perfil);
  return {
    totalAhorrado: total,
    ofertas: OFERTAS[perfil].map((o) => {
      const falta = r2(Math.max(0, o.requisito - total));
      return { ...o, desbloqueada: falta === 0, falta, mesesEstimados: falta === 0 ? 0 : Math.ceil(falta / ritmo) };
    }),
    aviso: 'Ofertas y socios ficticios.',
  };
}

/** Aviso cuando falta poco (S/ 300 o menos) para la siguiente oferta. */
export function alertaOferta(perfil: Perfil): Alerta[] {
  const o = verOfertas(perfil).ofertas.find((x) => !x.desbloqueada);
  if (!o || o.falta > 300) return [];
  return [{
    tipo: 'aviso',
    titulo: `Estás cerca de: ${o.titulo}`,
    corto: 'Oferta cerca',
    texto: `Te faltan S/ ${o.falta} de ahorro para desbloquear: ${o.beneficio.toLowerCase()}.`,
    pregunta: '¿Qué ofertas puedo desbloquear?',
  }];
}
