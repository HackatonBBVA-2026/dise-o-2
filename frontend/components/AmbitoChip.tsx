'use client';

import { useEffect, useRef, useState } from 'react';
import { useClasificacion } from './Clasificacion';
import type { MovimientoClasificado } from '@/lib/clasificacion';
import type { Ambito } from '@/lib/types';

export function etiquetaAmbito(m: Pick<MovimientoClasificado, 'efectivo' | 'pct'>) {
  if (m.efectivo === null) return 'Sin clasificar';
  if (m.efectivo === 'dividido') return `Dividido ${m.pct}/${100 - m.pct}`;
  return m.efectivo === 'negocio' ? 'Negocio' : 'Personal';
}

const OPCIONES: { ambito: Ambito; label: string; pct?: number }[] = [
  { ambito: 'personal', label: 'Personal' },
  { ambito: 'negocio', label: 'Negocio' },
  { ambito: 'dividido', label: 'Dividir 50/50', pct: 50 },
  { ambito: 'dividido', label: 'Dividir 70 negocio / 30 personal', pct: 70 },
];

/** Etiqueta del movimiento. Al tocarla abre un menú para reclasificarlo. */
export function AmbitoChip({ m }: { m: MovimientoClasificado }) {
  const { clasificarMovimiento } = useClasificacion();
  const [abierto, setAbierto] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    document.addEventListener('keydown', cerrar);
    return () => {
      document.removeEventListener('mousedown', cerrar);
      document.removeEventListener('keydown', cerrar);
    };
  }, [abierto]);

  const tono = m.efectivo === null ? 'sin' : m.efectivo;

  return (
    <span className="ambito" ref={ref}>
      <button
        type="button"
        className={`ambito-chip ambito-chip--${tono}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {etiquetaAmbito(m)}
        {m.origen === 'boot' && m.ia && <span className="ambito-chip__ia" title="Lo clasificó el modelo de IA de Mío"> · IA {Math.round(m.ia.confianza * 100)}%</span>}
      </button>
      {abierto && (
        <span className="ambito-menu" role="menu" aria-label={`Clasificar ${m.descripcion}`}>
          {OPCIONES.map((o) => {
            const activo = m.efectivo === o.ambito && (o.ambito !== 'dividido' || m.pct === o.pct);
            return (
              <button
                key={o.label}
                type="button"
                role="menuitemradio"
                aria-checked={activo}
                className="ambito-menu__item"
                disabled={recordar && o.ambito === 'dividido'}
                onClick={() => {
                  clasificarMovimiento(m.id, o.ambito, { pctNegocio: o.pct, recordar });
                  setAbierto(false);
                }}
              >
                {o.label}
              </button>
            );
          })}
          <label className="ambito-menu__recordar">
            <input type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
            Siempre para «{m.descripcion}»
          </label>
        </span>
      )}
    </span>
  );
}
