'use client';

import { useMemo, useState } from 'react';
import { Money } from './Money';
import { soles } from '@/lib/format';
import { enVista } from '@/lib/clasificacion';
import { AmbitoChip } from './AmbitoChip';
import { useClasificacion } from './Clasificacion';

/* Movimientos: búsqueda + filtros. Con RUC además se ve y se corrige el ámbito (personal / negocio). */
const FILTROS_AMBITO = [
  ['todo', 'Todo'],
  ['personal', 'Personal'],
  ['negocio', 'Negocio'],
  ['sin', 'Sin clasificar'],
] as const;

export function MovimientosView({ duplicados }: { duplicados: string[] }) {
  const { movimientos, perfil } = useClasificacion();
  const esEmpresa = perfil === 'empresa';
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'in' | 'out'>('todos');
  const [ambito, setAmbito] = useState<(typeof FILTROS_AMBITO)[number][0]>('todo');
  const dup = useMemo(() => new Set(duplicados), [duplicados]);
  const sinClasificar = movimientos.filter((m) => m.efectivo === null).length;

  const visibles = movimientos.filter((m) => {
    const tipo = m.monto > 0 ? 'in' : 'out';
    const texto = `${m.descripcion} ${m.categoria}`.toLowerCase();
    // Con DNI solo se ven los movimientos personales.
    const vista = esEmpresa ? ambito : 'personal';
    return (filtro === 'todos' || filtro === tipo) && enVista(m, vista) && texto.includes(q.trim().toLowerCase());
  });

  return (
    <section className="panel" aria-labelledby="movTitle">
      <header className="panel__head">
        <h2 id="movTitle">Movimientos de noviembre</h2>
        <span className="count">{visibles.length}</span>
      </header>
      <div className="filters">
        <label className="sr-only" htmlFor="buscarMov">Buscar movimiento</label>
        <input className="input" id="buscarMov" type="search" placeholder="Buscar comercio o categoría" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label="Filtrar por tipo">
          {([['todos', 'Todos'], ['in', 'Ingresos'], ['out', 'Gastos']] as const).map(([id, label]) => (
            <button key={id} type="button" className={`seg__btn${filtro === id ? ' is-active' : ''}`} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {esEmpresa && (
        <div className="chips-filtro" role="group" aria-label="Filtrar por ámbito">
          {FILTROS_AMBITO.map(([id, label]) => (
            <button key={id} type="button" className={`chip${ambito === id ? ' is-active' : ''}`} aria-pressed={ambito === id} onClick={() => setAmbito(id)}>
              {label}{id === 'sin' && sinClasificar > 0 && <span className="chip__count">{sinClasificar}</span>}
            </button>
          ))}
        </div>
      )}
      {visibles.length > 0 ? (
        <ul className="rows rows--mov">
          {visibles.map((m) => (
            <li key={m.id}>
              <span className="date"><b>{m.dia}</b>nov</span>
              <span className="rows__name">
                {m.descripcion}
                <small>
                  {m.categoria}
                  {dup.has(m.descripcion) && <> · <em className="tag tag--warn">posible duplicado</em></>}
                </small>
                {esEmpresa && <AmbitoChip m={m} />}
              </span>
              <Money className={m.monto > 0 ? 'pos' : undefined}>{m.monto > 0 ? '+' : ''}{soles(m.monto)}</Money>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Ningún movimiento coincide con estos filtros.</p>
      )}
      {esEmpresa && <p className="hint">Toca la etiqueta de un movimiento para cambiar si es personal o del negocio.</p>}
    </section>
  );
}
