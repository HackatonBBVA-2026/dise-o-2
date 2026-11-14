'use client';

import { useClasificacion } from './Clasificacion';

/** Perfil › Mi negocio: reglas automáticas por comercio. */
export function ReglasNegocio() {
  const { reglas, eliminarRegla, restablecer } = useClasificacion();

  return (
    <>
      {reglas.length === 0 ? (
        <p className="hint">No tienes reglas. Se crean al marcar «Clasificar siempre así» en un movimiento.</p>
      ) : (
        <ul className="rows">
          {reglas.map((r) => (
            <li key={r.comercio}>
              <span className="rows__name">
                {r.comercio}
                <small>
                  Siempre {r.ambito === 'negocio' ? 'negocio' : 'personal'} · {r.creadaPor === 'boot' ? 'la creó Boot' : 'la creaste tú'}
                </small>
              </span>
              <button type="button" className="btn-sm" onClick={() => eliminarRegla(r.comercio)} aria-label={`Borrar la regla de ${r.comercio}`}>
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="link link--btn" onClick={restablecer}>Restablecer clasificación de ejemplo</button>
    </>
  );
}
