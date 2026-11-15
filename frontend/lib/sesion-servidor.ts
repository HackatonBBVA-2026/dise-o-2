import { cookies } from 'next/headers';
import { cargarEstado } from './estado';
import { COOKIE_SESION, leerSesion, type Sesion } from './sesion';

/**
 * Sesión actual en componentes de servidor y route handlers. El proxy garantiza que exista en /app.
 * También trae el estado de la demo (Redis en Vercel) antes de que la página o la API lo lean.
 */
export async function sesionActual(): Promise<Sesion> {
  await cargarEstado();
  const valor = (await cookies()).get(COOKIE_SESION)?.value;
  return leerSesion(valor) ?? { perfil: 'persona', documento: '' };
}
