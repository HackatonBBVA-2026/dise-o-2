'use client';

import Link from 'next/link';
import { useClasificacion } from './Clasificacion';
import { Money, PrivacyToggle } from './Money';
import { IconOjo } from './icons';
import { soles } from '@/lib/format';
import type { Cobro, Vista } from '@/lib/types';

const VISTAS: { id: Vista; label: string }[] = [
  { id: 'personal', label: 'Personal' },
  { id: 'negocio', label: 'Negocio' },
  { id: 'todo', label: 'Todo' },
];

const COLORES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)', 'var(--cat-6)'];

interface Props {
  disponible: number;
  hoy: number;
  cierreMes: number;
  proximosCobros: Cobro[];
  nombreNegocio: string;
}

/** Selector Personal · Negocio · Todo + saldo y proyección según la vista. */
export function InicioSaldo({ disponible, hoy, cierreMes, proximosCobros, nombreNegocio }: Props) {
  const { vista, setVista, personal, negocio, pendientes, perfil } = useClasificacion();
  const pos = (d: number) => `${Math.min(100, Math.max(0, ((d - 1) / (cierreMes - 1)) * 100)).toFixed(2)}%`;
  const [entero, decimales] = soles(disponible).replace('S/ ', '').split('.');
  const enNegocio = vista === 'negocio';
  const rep = negocio.reposicion;

  return (
    <>
      {/* Solo quien entra con RUC tiene negocio: la persona (DNI) no ve el selector. */}
      {perfil === 'empresa' && (
        <div className="vista span-2" role="group" aria-label="Qué finanzas ver">
          {VISTAS.map((v) => (
            <button key={v.id} type="button" className={`vista__btn${vista === v.id ? ' is-active' : ''}`} aria-pressed={vista === v.id} onClick={() => setVista(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      <section className="balance" aria-labelledby="saldoTitle">
        <PrivacyToggle className="balance__toggle">
          <span className="eyebrow" id="saldoTitle">Saldo disponible <IconOjo size={14} /></span>
          <Money className="balance__amount">
            <span className="cur">S/</span>{entero}<span className="dec">.{decimales}</span>
          </Money>
          <span className="sr-only">Toca para ocultar o mostrar tus saldos</span>
        </PrivacyToggle>

        <div className="balance__proj">
          {enNegocio ? (
            <div>
              <span className="eyebrow">Resultado de {nombreNegocio} · nov</span>
              <strong><Money>{soles(negocio.resultado)}</Money></strong>
            </div>
          ) : (
            <div>
              <span className="eyebrow">Personal · al {cierreMes} nov</span>
              <strong><Money>{soles(Math.round(personal.proyeccion))}</Money></strong>
            </div>
          )}
          <span className={`status status--${enNegocio ? negocio.estado.nivel : personal.semaforo.nivel}`}>
            {enNegocio ? negocio.estado.texto : personal.semaforo.texto}
          </span>
        </div>

        {enNegocio ? (
          rep && (
            <div className="month" role="img" aria-label={`Repones stock cada ${rep.cada} días. Próxima compra estimada el día ${rep.proxima}.`}>
              <div className="month__track">
                <span className="month__done" style={{ width: pos(hoy) }} />
                {rep.dias.map((d) => <span key={d} className="month__tick month__tick--lleno" style={{ left: pos(d) }} title={`Compra de stock · día ${d}`} />)}
                {rep.proxima <= cierreMes && <span className="month__tick month__tick--estimado" style={{ left: pos(rep.proxima) }} title={`Próxima reposición estimada · día ${rep.proxima}`} />}
                <span className="month__today" style={{ left: pos(hoy) }} />
              </div>
              <div className="month__labels" aria-hidden="true">
                <span style={{ left: 0 }}>01</span>
                {rep.dias.map((d) => <span key={d} style={{ left: pos(d) }}>{d}</span>)}
                <span className="is-today" style={{ left: pos(hoy) }}>Hoy</span>
                {rep.proxima <= cierreMes && <span className="is-next" style={{ left: pos(rep.proxima) }}>~{rep.proxima}</span>}
                <span style={{ left: '100%' }}>{cierreMes}</span>
              </div>
            </div>
          )
        ) : (
          <div className="month" role="img" aria-label={`Día ${hoy} de ${cierreMes}. Cobros pendientes los días ${proximosCobros.map((c) => c.dia).join(', ')}.`}>
            <div className="month__track">
              <span className="month__done" style={{ width: pos(hoy) }} />
              {proximosCobros.map((c) => <span key={c.nombre} className="month__tick" style={{ left: pos(c.dia) }} title={`${c.nombre} · día ${c.dia}`} />)}
              <span className="month__today" style={{ left: pos(hoy) }} />
            </div>
            <div className="month__labels" aria-hidden="true">
              <span style={{ left: 0 }}>01</span>
              <span className="is-today" style={{ left: pos(hoy) }}>Hoy</span>
              {proximosCobros.map((c) => <span key={c.nombre} style={{ left: pos(c.dia) }}>{c.dia}</span>)}
              <span style={{ left: '100%' }}>{cierreMes}</span>
            </div>
          </div>
        )}

        {enNegocio && rep && (
          <p className="hint">
            Repones stock cada ~{rep.cada} días. La próxima compra sería alrededor del {rep.proxima} nov, por unos {soles(rep.montoPromedio, 0)}.
          </p>
        )}

        {perfil === 'empresa' && pendientes.length > 0 && (
          <Link className="pending-note" href="/app/avisos">
            {pendientes.length} movimiento{pendientes.length > 1 ? 's' : ''} sin clasificar no se cuenta{pendientes.length > 1 ? 'n' : ''} aún · <u>Clasificar</u>
          </Link>
        )}
      </section>

    </>
  );
}

/** Resumen del mes y categorías según la vista. */
export function InicioPaneles({ nombreNegocio }: { nombreNegocio: string }) {
  const { vista, personal, negocio } = useClasificacion();
  const enNegocio = vista === 'negocio';
  const ledger = calcularLedger(vista, personal, negocio);
  const categorias = vista === 'personal' ? personal.categorias : vista === 'negocio' ? negocio.categorias : mezclar(personal.categorias, negocio.categorias);

  return (
    <>
      {/* Resumen del mes */}
      <section className="panel" aria-labelledby="mesTitle">
        <header className="panel__head">
          <h2 id="mesTitle">{enNegocio ? `${nombreNegocio} · noviembre` : 'Noviembre'}</h2>
          <Link className="link" href="/app/movimientos">Movimientos</Link>
        </header>
        {ledger ? (
          <>
            <dl className="ledger">
              <div><dt>Ingresos</dt><dd><Money className="pos">+{soles(ledger.ingresos)}</Money></dd></div>
              <div><dt>Gastos</dt><dd><Money>{soles(-ledger.gastos)}</Money></dd></div>
              <div className="ledger__total"><dt>Te sobra</dt><dd><Money>{soles(ledger.neto)}</Money></dd></div>
            </dl>
            <div className="ratio" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round((ledger.gastos / ledger.ingresos) * 100))}%` }} /></div>
            <p className="hint">
              {vista === 'todo'
                ? 'Suma tus finanzas personales y las del negocio.'
                : `Gastaste ${personal.pctGasto} de cada 100 soles que ingresaron.`}
            </p>
          </>
        ) : (
          <>
            <dl className="ledger">
              <div><dt>Ventas</dt><dd><Money className="pos">+{soles(negocio.ventas)}</Money></dd></div>
              <div><dt>Mercadería</dt><dd><Money>{soles(-negocio.mercaderia)}</Money></dd></div>
              <div><dt>Otros gastos</dt><dd><Money>{soles(-negocio.otros)}</Money></dd></div>
              <div className="ledger__total"><dt>Resultado</dt><dd><Money>{soles(negocio.resultado)}</Money></dd></div>
            </dl>
            <p className="hint">Margen bruto del {negocio.margenBruto}%: de cada 100 soles que vendes, {negocio.margenBruto} quedan después de pagar la mercadería.</p>
          </>
        )}
      </section>

      {/* Categorías */}
      <section className="panel" aria-labelledby="catTitle">
        <header className="panel__head">
          <h2 id="catTitle">{enNegocio ? '¿En qué gasta el negocio?' : '¿En qué se va tu plata?'}</h2>
        </header>
        <div className="stack" aria-hidden="true">
          {categorias.map((c, i) => (
            <span key={c.nombre} style={{ width: `${c.pct}%`, background: c.alerta ? 'var(--cat-alerta)' : COLORES[i % COLORES.length] }} />
          ))}
        </div>
        <ul className="legend">
          {categorias.map((c, i) => (
            <li key={c.nombre}>
              <span className="swatch" style={{ background: c.alerta ? 'var(--cat-alerta)' : COLORES[i % COLORES.length] }} />
              <span className="legend__name">{c.nombre}{c.alerta && <> <em className="tag tag--warn">revisar</em></>}</span>
              <span className="legend__pct">{Math.round(c.pct)}%</span>
              <Money>{soles(c.monto)}</Money>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type Personal = ReturnType<typeof useClasificacion>['personal'];
type NegocioR = ReturnType<typeof useClasificacion>['negocio'];

/** En "Todo" se suman los dos lados; en "Negocio" el panel usa ventas y mercadería (null). */
function calcularLedger(vista: Vista, personal: Personal, negocio: NegocioR) {
  if (vista === 'personal') return { ingresos: personal.ingresos, gastos: personal.gastos, neto: personal.neto };
  if (vista === 'todo')
    return {
      ingresos: personal.ingresos + negocio.ventas,
      gastos: personal.gastos + negocio.mercaderia + negocio.otros,
      neto: personal.neto + negocio.resultado,
    };
  return null;
}

type Cat = { nombre: string; monto: number; alerta?: boolean };

/** Une las categorías personales y las del negocio (vista "Todo"). */
function mezclar(a: Cat[], b: Cat[]) {
  const m = new Map<string, { monto: number; alerta?: boolean }>();
  for (const c of [...a, ...b]) {
    const prev = m.get(c.nombre);
    m.set(c.nombre, { monto: (prev?.monto ?? 0) + c.monto, alerta: prev?.alerta || c.alerta });
  }
  const total = [...m.values()].reduce((s, c) => s + c.monto, 0) || 1;
  return [...m.entries()]
    .sort((x, y) => y[1].monto - x[1].monto)
    .map(([nombre, c]) => ({ nombre, monto: Math.round(c.monto * 100) / 100, pct: (c.monto / total) * 100, alerta: c.alerta }));
}
