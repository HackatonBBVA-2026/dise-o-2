// Persistencia del estado de la demo en Upstash Redis (API REST). SOLO SERVIDOR.
// Sin variables de Redis (desarrollo local) no hace nada: el estado vive en la memoria del proceso.
// En Vercel cada petición puede caer en una copia distinta del servidor, por eso:
//   - al empezar: cargarEstado() trae el estado de Redis a la memoria;
//   - al cambiar algo: guardarEstado() lo vuelve a escribir.
import { cache } from 'react';
import { exportarMemoria, importarMemoria, reiniciarMemoria } from './memoria';

const CLAVE = 'numa:estado:v1';
const url = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
export const conRedis = () => Boolean(url() && token());

async function redis(comando: (string | number)[]) {
  const res = await fetch(url(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comando),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Redis ${res.status}`);
  return (await res.json()).result as unknown;
}

async function cargar() {
  if (!conRedis()) return;
  try {
    const crudo = await redis(['GET', CLAVE]);
    if (typeof crudo === 'string') importarMemoria(JSON.parse(crudo));
    else reiniciarMemoria(); // aún no hay nada guardado: datos iniciales de la demo
  } catch (e) {
    console.warn('[estado] no se pudo leer Redis:', (e as Error).message);
  }
}

/** Trae el estado de Redis. En páginas se hace una vez por petición (layout y página comparten la carga). */
export const cargarEstado = cache(cargar);
/** Para rutas API: siempre lee lo último antes de cambiar algo. */
export const cargarEstadoFresco = cargar;

export async function guardarEstado() {
  if (!conRedis()) return;
  try {
    // 30 días: la demo no se queda guardada para siempre.
    await redis(['SET', CLAVE, JSON.stringify(exportarMemoria()), 'EX', 60 * 60 * 24 * 30]);
  } catch (e) {
    console.warn('[estado] no se pudo guardar en Redis:', (e as Error).message);
  }
}

/** Vuelve la demo a los datos iniciales (saldo, movimientos, metas). Los celulares registrados se mantienen. */
export async function reiniciarEstado() {
  const subs = exportarMemoria().pushSubs;
  reiniciarMemoria();
  if (subs) importarMemoria({ pushSubs: subs });
  await guardarEstado();
}
