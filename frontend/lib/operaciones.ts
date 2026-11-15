// Transferencias y pagos a celular (SIMULACIÓN: no se mueve dinero real).
// Cada operación descuenta del saldo de la cuenta y queda como un movimiento más del mes,
// así Inicio, Movimientos, Metas, el reporte y Mío la ven al instante.
import * as data from './data';
import { r2 } from './format';
import { memoria } from './memoria';
import type { Perfil } from './sesion';
import type { Movimiento } from './types';

export type TipoOperacion = 'celular' | 'cuenta';

export interface Contacto { nombre: string; celular: string }

// Contactos FICTICIOS para la demo.
export const CONTACTOS: Contacto[] = [
  { nombre: 'Luis Ramos', celular: '987654321' },
  { nombre: 'Carlos Mendoza', celular: '912345678' },
  { nombre: 'Rosa Paredes', celular: '956781234' },
];

/** Tope por pago a celular, como en las billeteras móviles. */
export const LIMITE_CELULAR = 500;
const LIMITE_CUENTA = 5000;

/** Operaciones hechas en esta sesión del servidor (lo más reciente primero). */
export const operaciones = () => memoria<Movimiento[]>('operaciones', () => []);

const soloDigitos = (t: unknown) => String(t ?? '').replace(/\D/g, '');
const enmascarar = (t: string) => `•••• ${t.slice(-4)}`;
const primerNombre = (n: string) => {
  const [a, b] = n.trim().split(/\s+/);
  return b ? `${a} ${b[0]}.` : a;
};

export function validarOperacion(body: Record<string, unknown>, perfil: Perfil) {
  const tipo = body.tipo === 'cuenta' ? 'cuenta' : body.tipo === 'celular' ? 'celular' : null;
  const monto = r2(Number(body.monto));
  const nota = String(body.nota ?? '').trim().slice(0, 40);
  const cuenta = data.cuentas[0];
  if (!tipo) return { ok: false as const, error: 'Elige si pagas a un celular o transfieres a una cuenta.' };
  if (!(monto > 0)) return { ok: false as const, error: 'Ingresa un monto mayor a 0.' };
  if (monto > cuenta.saldo) return { ok: false as const, error: 'No tienes saldo suficiente para esta operación.' };

  let destino: string;
  let detalle: string;
  if (tipo === 'celular') {
    const cel = soloDigitos(body.celular);
    if (!/^9\d{8}$/.test(cel)) return { ok: false as const, error: 'El celular debe tener 9 dígitos y empezar con 9.' };
    if (monto > LIMITE_CELULAR) return { ok: false as const, error: `El pago a celular tiene un tope de S/ ${LIMITE_CELULAR} por operación.` };
    const c = CONTACTOS.find((x) => x.celular === cel);
    destino = c ? c.nombre : 'Contacto';
    detalle = `Celular 9•• ••• ${cel.slice(-3)}`;
  } else {
    const num = soloDigitos(body.cuenta);
    if (num.length !== 14 && num.length !== 20) return { ok: false as const, error: 'La cuenta debe tener 14 dígitos (mismo banco) o 20 (CCI, otro banco).' };
    const titular = String(body.titular ?? '').trim().slice(0, 40);
    if (titular.length < 3) return { ok: false as const, error: 'Escribe el nombre del titular de la cuenta.' };
    if (monto > LIMITE_CUENTA) return { ok: false as const, error: `Por seguridad, la demo permite hasta S/ ${LIMITE_CUENTA} por transferencia.` };
    destino = titular;
    detalle = `${num.length === 20 ? 'CCI · otro banco' : 'Mismo banco'} ${enmascarar(num)}`;
  }

  // Con RUC se elige si la operación es del negocio o personal; con DNI siempre es personal.
  const ambito = perfil === 'empresa' && body.ambito === 'negocio' ? 'negocio' : 'personal';
  return { ok: true as const, tipo, monto, nota, destino, detalle, ambito } as const;
}

export function realizarOperacion(body: Record<string, unknown>, perfil: Perfil) {
  const v = validarOperacion(body, perfil);
  if (!v.ok) return v;

  const cuenta = data.cuentas[0];
  const lista = operaciones();
  const numero = String(48213000 + lista.length * 7 + 11).padStart(8, '0');
  const mov: Movimiento = {
    id: `op-${numero}`,
    dia: data.hoy,
    descripcion: `${v.tipo === 'celular' ? 'Pago a celular' : 'Transferencia'} a ${primerNombre(v.destino)}`,
    categoria: v.ambito === 'negocio' ? (v.tipo === 'celular' ? 'Pago a ayudante' : 'Pago a proveedor') : 'Transferencias',
    monto: -v.monto,
    ambito: v.ambito,
    clasificadoPor: 'usuario',
    pendienteInicial: true, // no estaba en el resumen base del mes: suma al gasto
    operacion: true,
  };
  cuenta.saldo = r2(cuenta.saldo - v.monto);
  lista.unshift(mov);

  return {
    ok: true as const,
    constancia: {
      numero,
      tipo: v.tipo,
      monto: v.monto,
      destino: v.destino,
      detalle: v.detalle,
      nota: v.nota,
      ambito: v.ambito,
      fecha: `${data.hoy} nov`,
      cuentaOrigen: `${cuenta.tipo} ${enmascarar(cuenta.numero)}`,
      saldoDisponible: cuenta.saldo,
    },
    aviso: 'Simulación: no se movió dinero real.',
  };
}

/** Demo: simula que alguien te transfiere (con RUC, un cliente que te paga por la venta). */
export function recibirTransferencia(perfil: Perfil, monto = perfil === 'empresa' ? 120 : 150) {
  const c = CONTACTOS[2];
  const cuenta = data.cuentas[0];
  const lista = operaciones();
  const negocio = perfil === 'empresa';
  const mov: Movimiento = {
    id: `in-${48213000 + lista.length * 7 + 13}`,
    dia: data.hoy,
    descripcion: negocio ? `Pago de cliente · ${primerNombre(c.nombre)}` : `Transferencia de ${primerNombre(c.nombre)}`,
    categoria: negocio ? 'Ventas' : 'Ingreso',
    monto: r2(monto),
    ambito: negocio ? 'negocio' : 'personal',
    clasificadoPor: 'usuario',
    pendienteInicial: true,
    operacion: true,
  };
  cuenta.saldo = r2(cuenta.saldo + mov.monto);
  lista.unshift(mov);
  return { de: c.nombre, monto: mov.monto, negocio, saldoDisponible: cuenta.saldo };
}

export type Constancia = Extract<ReturnType<typeof realizarOperacion>, { ok: true }>['constancia'];
