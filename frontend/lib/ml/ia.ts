// Mío clasifica con el modelo de ML: ¿cada movimiento es del negocio o personal? SOLO SERVIDOR.
// El modelo (entrenado en ml/, exportado con ml/exportar.py) da una probabilidad; además, por prudencia,
// Mío NO decide solo y le pregunta al usuario cuando:
//   - la descripción no dice el comercio (PAGO QR, COMPRA POS, TRANSF), igual que en ml/modelo.py;
//   - es una transferencia a una persona (puede ser el pago a un ayudante o algo personal);
//   - la confianza es menor al 70%;
//   - es una compra grande (S/ 200 o más) en un comercio que aparece por primera vez.
// Al importarse, se registra para que lib/clasificacion.ts lo use en el servidor (el navegador recibe las predicciones hechas).
import type { Predicciones } from '../clasificacion';
import type { Movimiento } from '../types';
import { probabilidadNegocio, type ModeloAmbito } from './ambito';
import modeloJson from './modelo-ambito.json';

const MODELO = modeloJson as unknown as ModeloAmbito;
const GENERICA = /^(PAGO QR|COMPRA POS|TRANSF)$/;
const MES = '2026-11'; // mes de la demo
const PERFIL = { perfil: 'empresa', rubro: 'bodega' }; // la cuenta de Ana: persona con negocio (bodega)

/** Nombre del comercio sin códigos ni números ("MAXIAHORRO 79" → "MAXIAHORRO"). */
const comercio = (banco: string) => banco.split(/\s+/).filter((p) => !/\d/.test(p)).join(' ').replace(/\*.*$/, '').trim();

const cache = new Map<string, number>();

export function predecir(movs: Movimiento[]): Predicciones {
  const veces = new Map<string, number>();
  for (const m of movs) if (m.banco) veces.set(comercio(m.banco), (veces.get(comercio(m.banco)) ?? 0) + 1);

  const out: Predicciones = {};
  for (const m of movs) {
    if (!m.banco) continue;
    const clave = `${m.banco}|${m.monto}|${m.medio}|${m.dia}`;
    let p = cache.get(clave);
    if (p === undefined) {
      p = probabilidadNegocio(MODELO, {
        descripcion: m.banco,
        monto: m.monto,
        medio: m.medio ?? 'tarjeta',
        fecha: `${MES}-${String(m.dia).padStart(2, '0')}`,
        ...PERFIL,
      });
      cache.set(clave, p);
    }
    const ambito = p >= 0.5 ? 'negocio' : 'personal';
    const confianza = Math.round(Math.max(p, 1 - p) * 1000) / 1000;
    const motivo = GENERICA.test(m.banco.trim())
      ? 'La descripción del banco no dice el comercio.'
      : /^TRANSF A /.test(m.banco) && m.monto < 0
        ? 'Es una transferencia a una persona: puede ser el pago a un ayudante o algo personal.'
        : confianza < MODELO.umbral
          ? `No estoy seguro: ${Math.round(confianza * 100)}% de confianza.`
          : m.monto <= -200 && (veces.get(comercio(m.banco)) ?? 0) <= 1
            ? 'Es una compra grande en un comercio nuevo.'
            : undefined;
    out[m.id] = { ambito, confianza, decide: !motivo, ...(motivo ? { motivo } : {}) };
  }
  return out;
}

// Registro para lib/clasificacion.ts (que también corre en el navegador y no debe cargar el modelo).
(globalThis as typeof globalThis & { __mioIA?: typeof predecir }).__mioIA = predecir;
