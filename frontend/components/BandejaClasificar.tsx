'use client';

import { useState } from 'react';
import { etiquetaAmbito } from './AmbitoChip';
import { useClasificacion } from './Clasificacion';
import { Money } from './Money';
import { soles } from '@/lib/format';
import type { MovimientoClasificado } from '@/lib/clasificacion';

/** Bandeja de Avisos: movimientos que Boot no supo clasificar con seguridad. */
export function BandejaClasificar() {
  const { pendientes } = useClasificacion();

  return (
    <section className="panel" aria-labelledby="bandejaTitle">
      <header className="panel__head">
        <h2 id="bandejaTitle">Por clasificar</h2>
        <span className="count">{pendientes.length ? `${pendientes.length} pendientes` : 'Al día'}</span>
      </header>
      {pendientes.length === 0 ? (
        <p className="hint">Todo está clasificado. Tus resúmenes personal y del negocio ya cuentan cada movimiento.</p>
      ) : (
        <>
          <p className="hint">Boot no está seguro de si estos gastos son tuyos o de la bodega. Mientras no los clasifiques, no cuentan en ningún resumen.</p>
          <ul className="bandeja">
            {pendientes.map((m) => <ItemPendiente key={m.id} m={m} />)}
          </ul>
        </>
      )}
    </section>
  );
}

function ItemPendiente({ m }: { m: MovimientoClasificado }) {
  const { clasificarMovimiento } = useClasificacion();
  const [recordar, setRecordar] = useState(false);
  const sugerencia = etiquetaAmbito({ efectivo: m.ambito, pct: m.ambito === 'dividido' ? m.pctNegocio ?? 50 : m.ambito === 'negocio' ? 100 : 0 });
  const idRecordar = `recordar-${m.id}`;

  return (
    <li className="bandeja__item">
      <div className="bandeja__top">
        <span className="date"><b>{m.dia}</b>nov</span>
        <span className="rows__name">{m.descripcion}<small>{m.categoria}</small></span>
        <Money>{soles(m.monto)}</Money>
      </div>
      <p className="bandeja__sugerencia">
        Boot sugiere <strong>{sugerencia}</strong> · {Math.round((m.confianza ?? 0) * 100)}% de confianza
      </p>
      <div className="bandeja__acciones">
        <button type="button" className="btn-sm" onClick={() => clasificarMovimiento(m.id, 'personal', { recordar })}>Personal</button>
        <button type="button" className="btn-sm" onClick={() => clasificarMovimiento(m.id, 'negocio', { recordar })}>Negocio</button>
        <button type="button" className="btn-sm" disabled={recordar} onClick={() => clasificarMovimiento(m.id, 'dividido', { pctNegocio: 50 })}>Dividir 50/50</button>
      </div>
      <label className="bandeja__recordar" htmlFor={idRecordar}>
        <input id={idRecordar} type="checkbox" checked={recordar} onChange={(e) => setRecordar(e.target.checked)} />
        Clasificar siempre así los gastos en «{m.descripcion}»
      </label>
    </li>
  );
}
