import { getResumen } from './finanzas';
import { alertasMetas } from './metas';
import { alertaOferta } from './ahorro';
import type { Perfil } from './sesion';

/** Todos los avisos de Boot para el perfil: fin de mes, duplicados, metas de gasto y ofertas cercanas. */
export function alertasDe(perfil: Perfil) {
  return [...getResumen().alertas, ...alertasMetas(perfil), ...alertaOferta(perfil)];
}
