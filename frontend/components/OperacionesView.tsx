'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Money } from './Money';
import { useApp } from './Providers';
import { IconDolar, IconLista, IconQR, IconTransferir } from './icons';
import { soles } from '@/lib/format';
import { preguntarABoot } from '@/lib/links';
import type { Cuenta, Movimiento, TipoCambio } from '@/lib/types';

const PANELES = [
  { id: 'movimientos', label: 'Movimientos', Icon: IconLista },
  { id: 'transferir', label: 'Transferir', Icon: IconTransferir },
  { id: 'qr', label: 'Pagos QR', Icon: IconQR },
  { id: 'cambio', label: 'T-Cambio', Icon: IconDolar },
] as const;
type PanelId = (typeof PANELES)[number]['id'];

const esPanel = (h: string): h is PanelId => PANELES.some((p) => p.id === h);

interface Props {
  movimientos: Movimiento[];
  duplicados: string[];
  cuentas: Cuenta[];
  tipoCambio: TipoCambio;
}

export function OperacionesView({ movimientos, duplicados, cuentas, tipoCambio }: Props) {
  const [panel, setPanel] = useState<PanelId>('movimientos');

  // El panel se puede abrir directo con la URL, p. ej. /app/operaciones#transferir
  useEffect(() => {
    const leer = () => {
      const h = location.hash.slice(1);
      if (esPanel(h)) setPanel(h);
    };
    leer();
    window.addEventListener('hashchange', leer);
    return () => window.removeEventListener('hashchange', leer);
  }, []);

  const abrir = (id: PanelId) => {
    setPanel(id);
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <div className="ops">
      <div className="tabs" role="tablist" aria-label="Tipo de operación">
        {PANELES.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="tab"
            role="tab"
            id={`tab-${id}`}
            aria-controls={id}
            aria-selected={panel === id}
            tabIndex={panel === id ? 0 : -1}
            onClick={() => abrir(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {panel === 'movimientos' && <Movimientos movimientos={movimientos} duplicados={duplicados} />}
      {panel === 'transferir' && <Transferir cuentas={cuentas} />}
      {panel === 'qr' && <PagosQR />}
      {panel === 'cambio' && <Cambio tipoCambio={tipoCambio} />}
    </div>
  );
}

/* ---------- Movimientos: búsqueda + filtro ---------- */
function Movimientos({ movimientos, duplicados }: { movimientos: Movimiento[]; duplicados: string[] }) {
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'in' | 'out'>('todos');
  const dup = useMemo(() => new Set(duplicados), [duplicados]);

  const visibles = movimientos.filter((m) => {
    const tipo = m.monto > 0 ? 'in' : 'out';
    const texto = `${m.descripcion} ${m.categoria}`.toLowerCase();
    return (filtro === 'todos' || filtro === tipo) && texto.includes(q.trim().toLowerCase());
  });

  return (
    <section className="panel tabpanel" id="movimientos" role="tabpanel" aria-labelledby="tab-movimientos">
      <header className="panel__head">
        <h2>Movimientos de noviembre</h2>
        <span className="count">{visibles.length}</span>
      </header>
      <div className="filters">
        <label className="sr-only" htmlFor="buscarMov">Buscar movimiento</label>
        <input className="input" id="buscarMov" type="search" placeholder="Buscar comercio o categoría" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg" role="group" aria-label="Filtrar">
          {([['todos', 'Todos'], ['in', 'Ingresos'], ['out', 'Gastos']] as const).map(([id, label]) => (
            <button key={id} type="button" className={`seg__btn${filtro === id ? ' is-active' : ''}`} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {visibles.length > 0 ? (
        <ul className="rows">
          {visibles.map((m, i) => (
            <li key={`${m.dia}-${m.descripcion}-${i}`}>
              <span className="date"><b>{m.dia}</b>nov</span>
              <span className="rows__name">
                {m.descripcion}
                <small>
                  {m.categoria}
                  {dup.has(m.descripcion) && <> · <em className="tag tag--warn">posible duplicado</em></>}
                </small>
              </span>
              <Money className={m.monto > 0 ? 'pos' : undefined}>{m.monto > 0 ? '+' : ''}{soles(m.monto)}</Money>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Ningún movimiento coincide con tu búsqueda.</p>
      )}
    </section>
  );
}

/* ---------- Transferir ---------- */
function Transferir({ cuentas }: { cuentas: Cuenta[] }) {
  const { toast } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ cuentaId: cuentas[0]?.id ?? '', destino: '', monto: '', descripcion: '' });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch('/api/transferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) return setError(data.error);
      setForm((f) => ({ ...f, destino: '', monto: '', descripcion: '' }));
      toast(`${data.mensaje} Código ${data.codigo}.`);
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="panel tabpanel" id="transferir" role="tabpanel" aria-labelledby="tab-transferir">
      <header className="panel__head"><h2>Transferir</h2></header>
      <form className="form" onSubmit={enviar} noValidate>
        <div className="field">
          <label htmlFor="tCuenta">Desde</label>
          <select className="input" id="tCuenta" value={form.cuentaId} onChange={set('cuentaId')}>
            {cuentas.map((c) => <option key={c.id} value={c.id}>Ahorros •••• {c.numero}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tDestino">Cuenta destino o CCI</label>
          <input className="input mono" id="tDestino" inputMode="numeric" placeholder="002 191 001234567890 54" value={form.destino} onChange={set('destino')} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="tMonto">Monto</label>
            <div className="input-affix">
              <span>S/</span>
              <input className="input" id="tMonto" type="number" min="0.01" step="0.01" placeholder="0.00" value={form.monto} onChange={set('monto')} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="tDesc">Descripción <small>opcional</small></label>
            <input className="input" id="tDesc" maxLength={40} placeholder="Alquiler" value={form.descripcion} onChange={set('descripcion')} />
          </div>
        </div>
        {error && <p className="form__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Continuar'}</button>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={() => router.push(preguntarABoot(`¿Me alcanza si gasto S/ ${Number(form.monto) || 200}?`))}
          >
            ¿Me alcanza? Preguntar a Boot
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------- Pagos QR ---------- */
function PagosQR() {
  return (
    <section className="panel tabpanel" id="qr" role="tabpanel" aria-labelledby="tab-qr">
      <header className="panel__head"><h2>Pagos QR</h2></header>
      <div className="qr">
        <div className="qr__frame" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="qr__actions">
          <p className="hint">Apunta la cámara al QR del comercio. Verás el monto y el nombre antes de confirmar.</p>
          <button className="btn" type="button" data-demo="Escanear QR">Escanear QR</button>
          <button className="btn btn--ghost" type="button" data-demo="Mi QR para cobrar">Mostrar mi QR para cobrar</button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Tipo de cambio ---------- */
function Cambio({ tipoCambio }: { tipoCambio: TipoCambio }) {
  const [modo, setModo] = useState<'comprar' | 'vender'>('comprar');
  const [valor, setValor] = useState('100');
  const v = Number(valor) || 0;
  // Comprar dólares: pagas soles al precio de venta del banco. Vender dólares: recibes soles al de compra.
  const resultado = modo === 'comprar' ? `US$ ${(v / tipoCambio.venta).toFixed(2)}` : `S/ ${(v * tipoCambio.compra).toFixed(2)}`;

  return (
    <section className="panel tabpanel" id="cambio" role="tabpanel" aria-labelledby="tab-cambio">
      <header className="panel__head"><h2>Tipo de cambio</h2><span className="count">referencial</span></header>
      <dl className="fx">
        <div><dt>Compra</dt><dd className="money">S/ {tipoCambio.compra.toFixed(3)}</dd></div>
        <div><dt>Venta</dt><dd className="money">S/ {tipoCambio.venta.toFixed(3)}</dd></div>
      </dl>
      <div className="form">
        <div className="seg" role="group" aria-label="Operación">
          <button type="button" className={`seg__btn${modo === 'comprar' ? ' is-active' : ''}`} aria-pressed={modo === 'comprar'} onClick={() => setModo('comprar')}>Quiero dólares</button>
          <button type="button" className={`seg__btn${modo === 'vender' ? ' is-active' : ''}`} aria-pressed={modo === 'vender'} onClick={() => setModo('vender')}>Quiero soles</button>
        </div>
        <div className="field">
          <label htmlFor="fxIn">{modo === 'comprar' ? 'Envías (S/)' : 'Envías (US$)'}</label>
          <input className="input" id="fxIn" type="number" min="0" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <p className="fx__out">Recibes <strong className="money">{resultado}</strong></p>
        <button className="btn" type="button" data-demo="Cambio de moneda">Cambiar</button>
      </div>
    </section>
  );
}
