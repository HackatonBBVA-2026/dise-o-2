// Sesión de demostración: el documento con el que entras define tu perfil.
//   DNI (8 dígitos)  → 'persona'  (finanzas personales)
//   RUC (11 dígitos) → 'empresa'  (emprendedor o empresa: ve su negocio)
// No hay usuarios reales ni se valida contra SUNAT/RENIEC: es solo para el concepto.

export type Perfil = 'persona' | 'empresa';

export interface Sesion {
  perfil: Perfil;
  /** Documento enmascarado para mostrar en la app, por ejemplo "10•••••••24". */
  documento: string;
}

export const COOKIE_SESION = 'mio.sesion';
export const DURACION_SESION = 60 * 60 * 24 * 7; // 7 días

/** Documentos de demostración que se muestran en la pantalla de inicio de sesión. */
export const DEMO = { dni: '45678912', ruc: '10456789124' } as const;

const PESOS_RUC = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Dígito verificador del RUC (módulo 11). */
export function rucValido(ruc: string) {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false;
  const suma = PESOS_RUC.reduce((acc, p, i) => acc + p * Number(ruc[i]), 0);
  const r = 11 - (suma % 11);
  const dv = r === 10 ? 0 : r === 11 ? 1 : r;
  return dv === Number(ruc[10]);
}

const enmascarar = (doc: string) => doc.slice(0, 2) + '•'.repeat(doc.length - 4) + doc.slice(-2);

export function validarDocumento(entrada: unknown): { ok: true; sesion: Sesion } | { ok: false; error: string } {
  const doc = String(entrada ?? '').replace(/\D/g, '');
  if (doc.length === 8) return { ok: true, sesion: { perfil: 'persona', documento: enmascarar(doc) } };
  if (doc.length === 11) {
    if (!rucValido(doc)) return { ok: false, error: 'Ese RUC no es válido. Revisa los 11 dígitos.' };
    return { ok: true, sesion: { perfil: 'empresa', documento: enmascarar(doc) } };
  }
  return { ok: false, error: 'Ingresa tu DNI (8 dígitos) o tu RUC (11 dígitos).' };
}

export const codificarSesion = (s: Sesion) => `${s.perfil}|${s.documento}`;

export function leerSesion(valor: string | undefined | null): Sesion | null {
  if (!valor) return null;
  const [perfil, documento] = valor.split('|');
  if (perfil !== 'persona' && perfil !== 'empresa') return null;
  return { perfil, documento: documento ?? '' };
}
