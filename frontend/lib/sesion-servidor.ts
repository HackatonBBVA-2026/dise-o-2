import { cookies } from 'next/headers';
import { COOKIE_SESION, leerSesion, type Sesion } from './sesion';

/** Sesión actual en componentes de servidor y route handlers. El proxy garantiza que exista en /app. */
export async function sesionActual(): Promise<Sesion> {
  const valor = (await cookies()).get(COOKIE_SESION)?.value;
  return leerSesion(valor) ?? { perfil: 'persona', documento: '' };
}
