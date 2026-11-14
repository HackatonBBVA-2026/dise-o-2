'use client';

import { useApp } from './Providers';

const OPCIONES = [
  { id: 'ocultarSaldos', label: 'Ocultar saldos', ayuda: 'Muestra puntos en lugar de montos' },
  { id: 'avisosBoot', label: 'Alertas de Boot', ayuda: 'Punto en la pestaña Avisos e Inicio' },
  { id: 'push', label: 'Notificaciones push', ayuda: 'Cada movimiento y cobro' },
] as const;

export function Ajustes() {
  const { prefs, setPref } = useApp();
  return (
    <ul className="rows">
      {OPCIONES.map((o) => (
        <li key={o.id}>
          <label className="rows__name" htmlFor={`opt-${o.id}`}>{o.label}<small>{o.ayuda}</small></label>
          <input
            type="checkbox"
            className="switch"
            id={`opt-${o.id}`}
            checked={prefs[o.id]}
            onChange={(e) => setPref(o.id, e.target.checked)}
          />
        </li>
      ))}
    </ul>
  );
}
