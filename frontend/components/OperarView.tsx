'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useClasificacion } from './Clasificacion';
import { Money } from './Money';
import { useApp } from './Providers';
import { IconCelular, IconTransferir } from './icons';
import { soles } from '@/lib/format';
import type { Constancia, Contacto, TipoOperacion } from '@/lib/operaciones';

interface Props {
  disponible: number;
  contactos: Contacto[];
  limiteCelular: number;
  tipoInicial: TipoOperacion;
}

const formatoCel = (t: string) => t.replace(/\D/g, '').slice(0, 9).replace(/^(\d{3})(\d{0,3})(\d{0,3}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));

/** Transferir a una cuenta o pagar a un celular: formulario → confirmar → constancia. Todo simulado. */
export function OperarView({ disponible, contactos, limiteCelular, tipoInicial }: Props) {
  const router = useRouter();
  const { toast } = useApp();
  const { perfil, personal } = useClasificacion();
  const esEmpresa = perfil === 'empresa';

  const [tipo, setTipo] = useState<TipoOperacion>(tipoInicial);
  const [celular, setCelular] = useState('');
  const [cuenta, setCuenta] = useState('');
  const [titular, setTitular] = useState('');
  const [monto, setMonto] = useState('');
  const [nota, setNota] = useState('');
  const [ambito, setAmbito] = useState<'personal' | 'negocio'>(esEmpresa ? 'negocio' : 'personal');
  const [paso, setPaso] = useState<'datos' | 'confirmar'>('datos');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [constancia, setConstancia] = useState<Constancia | null>(null);

  const m = Number(monto);
  const celDigitos = celular.replace(/\D/g, '');
  const contacto = contactos.find((c) => c.celular === celDigitos);
  const destino = tipo === 'celular' ? contacto?.nombre ?? (celDigitos.length === 9 ? `Celular ${formatoCel(celDigitos)}` : '') : titular.trim();
  // Mío revisa antes de confirmar: cómo quedaría el fin de mes (solo afecta lo personal).
  const finDeMes = Math.round(personal.proyeccion - (ambito === 'personal' ? m || 0 : 0));

  function validar() {
    if (!(m > 0)) return 'Ingresa un monto mayor a 0.';
    if (m > disponible) return 'No tienes saldo suficiente para esta operación.';
    if (tipo === 'celular') {
      if (!/^9\d{8}$/.test(celDigitos)) return 'El celular debe tener 9 dígitos y empezar con 9.';
      if (m > limiteCelular) return `El pago a celular tiene un tope de S/ ${limiteCelular} por operación.`;
    } else {
      const n = cuenta.replace(/\D/g, '').length;
      if (n !== 14 && n !== 20) return 'La cuenta debe tener 14 dígitos (mismo banco) o 20 (CCI, otro banco).';
      if (titular.trim().length < 3) return 'Escribe el nombre del titular de la cuenta.';
    }
    return '';
  }

  async function confirmar() {
    setEnviando(true);
    setError('');
    try {
      const res = await fetch('/api/operaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, monto: m, celular: celDigitos, cuenta, titular, nota, ambito }),
      });
      const r = await res.json();
      if (!r.ok) {
        setError(r.error ?? 'No se pudo completar la operación.');
        setPaso('datos');
        return;
      }
      setConstancia(r.constancia);
      router.refresh(); // saldo, movimientos y resumen se actualizan en toda la app
    } catch {
      toast('No pude conectarme. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function nueva() {
    setConstancia(null);
    setPaso('datos');
    setCelular('');
    setCuenta('');
    setTitular('');
    setMonto('');
    setNota('');
  }

  if (constancia) {
    return (
      <section className="panel constancia" aria-labelledby="constTitle">
        <span className="constancia__check" aria-hidden="true">✓</span>
        <h2 id="constTitle" className="constancia__titulo">{constancia.tipo === 'celular' ? 'Pago enviado' : 'Transferencia realizada'}</h2>
        <Money className="constancia__monto">{soles(constancia.monto)}</Money>
        <dl className="resumen-op">
          <div><dt>Para</dt><dd>{constancia.destino}<small>{constancia.detalle}</small></dd></div>
          <div><dt>Desde</dt><dd>{constancia.cuentaOrigen}</dd></div>
          {constancia.nota && <div><dt>Mensaje</dt><dd>{constancia.nota}</dd></div>}
          {esEmpresa && <div><dt>Registrado como</dt><dd>{constancia.ambito === 'negocio' ? 'Negocio' : 'Personal'}</dd></div>}
          <div><dt>Fecha</dt><dd>{constancia.fecha}</dd></div>
          <div><dt>N.° de operación</dt><dd>{constancia.numero}</dd></div>
          <div><dt>Saldo disponible</dt><dd><Money>{soles(constancia.saldoDisponible)}</Money></dd></div>
        </dl>
        <p className="hint">Simulación de la demo: no se movió dinero real.</p>
        <div className="form__actions">
          <button className="btn" type="button" onClick={nueva}>Hacer otra operación</button>
          <Link className="btn btn--ghost" href="/app/movimientos">Ver mis movimientos</Link>
        </div>
      </section>
    );
  }

  if (paso === 'confirmar') {
    return (
      <section className="panel" aria-labelledby="confTitle">
        <header className="panel__head"><h2 id="confTitle">Confirma la operación</h2></header>
        <Money className="constancia__monto">{soles(m)}</Money>
        <dl className="resumen-op">
          <div><dt>Para</dt><dd>{destino}<small>{tipo === 'celular' ? `Pago a celular · ${formatoCel(celDigitos)}` : `Cuenta ${cuenta.replace(/\D/g, '').length === 20 ? 'CCI · otro banco' : 'mismo banco'}`}</small></dd></div>
          {nota && <div><dt>Mensaje</dt><dd>{nota}</dd></div>}
          {esEmpresa && <div><dt>Se registra como</dt><dd>{ambito === 'negocio' ? 'Negocio' : 'Personal'}</dd></div>}
          <div><dt>Comisión</dt><dd>S/ 0.00</dd></div>
        </dl>
        <MioRevisa finDeMes={finDeMes} ambito={ambito} />
        {error && <p className="form__error" role="alert">{error}</p>}
        <div className="form__actions">
          <button className="btn" type="button" onClick={confirmar} disabled={enviando}>{enviando ? 'Enviando…' : 'Confirmar y enviar'}</button>
          <button className="btn btn--ghost" type="button" onClick={() => setPaso('datos')} disabled={enviando}>Volver y editar</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="opTitle">
      <header className="panel__head"><h2 id="opTitle">¿Qué quieres hacer?</h2></header>
      <div className="op-tipos" role="group" aria-label="Tipo de operación">
        {([
          ['celular', 'Pagar a celular', 'Con su número', IconCelular],
          ['cuenta', 'Transferir', 'A una cuenta o CCI', IconTransferir],
        ] as const).map(([id, titulo, sub, Icon]) => (
          <button key={id} type="button" className={`op-tipo${tipo === id ? ' is-active' : ''}`} aria-pressed={tipo === id} onClick={() => { setTipo(id); setError(''); }}>
            <span className="quick__icon"><Icon /></span>
            <b>{titulo}</b>
            <small>{sub}</small>
          </button>
        ))}
      </div>

      <form
        className="form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const err = validar();
          setError(err);
          if (!err) setPaso('confirmar');
        }}
      >
        {tipo === 'celular' ? (
          <>
            <div className="field">
              <label>Contactos frecuentes</label>
              <div className="chips-filtro">
                {contactos.map((c) => (
                  <button key={c.celular} type="button" className={`chip${celDigitos === c.celular ? ' is-active' : ''}`} aria-pressed={celDigitos === c.celular} onClick={() => setCelular(formatoCel(c.celular))}>
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="opCel">Número de celular</label>
              <input id="opCel" className="input" type="tel" inputMode="numeric" autoComplete="off" placeholder="9•• ••• •••" value={celular} onChange={(e) => setCelular(formatoCel(e.target.value))} />
              {contacto && <p className="hint">Se enviará a <b>{contacto.nombre}</b>.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label htmlFor="opCta">Número de cuenta o CCI <small>14 o 20 dígitos</small></label>
              <input id="opCta" className="input" inputMode="numeric" autoComplete="off" placeholder="00000000000000" value={cuenta} onChange={(e) => setCuenta(e.target.value.replace(/[^\d -]/g, '').slice(0, 24))} />
            </div>
            <div className="field">
              <label htmlFor="opTit">Titular de la cuenta</label>
              <input id="opTit" className="input" autoComplete="off" maxLength={40} placeholder="Nombre y apellido" value={titular} onChange={(e) => setTitular(e.target.value)} />
            </div>
          </>
        )}

        <div className="field">
          <label htmlFor="opMonto">Monto <small>Disponible {soles(disponible)}{tipo === 'celular' ? ` · tope S/ ${limiteCelular}` : ''}</small></label>
          <div className="input-affix">
            <span>S/</span>
            <input id="opMonto" className="input" type="number" inputMode="decimal" min={0.1} step="0.1" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="opNota">Mensaje <small>opcional</small></label>
          <input id="opNota" className="input" maxLength={40} placeholder={tipo === 'celular' ? 'Ej. Menú del almuerzo' : 'Ej. Pago de mercadería'} value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>

        {esEmpresa && (
          <div className="field">
            <label>¿De qué es este pago?</label>
            <div className="seg" role="group" aria-label="Registrar como">
              {(['negocio', 'personal'] as const).map((a) => (
                <button key={a} type="button" className={`seg__btn${ambito === a ? ' is-active' : ''}`} aria-pressed={ambito === a} onClick={() => setAmbito(a)}>
                  {a === 'negocio' ? 'Del negocio' : 'Personal'}
                </button>
              ))}
            </div>
          </div>
        )}

        {m > 0 && <MioRevisa finDeMes={finDeMes} ambito={ambito} />}
        {error && <p className="form__error" role="alert">{error}</p>}
        <button className="btn" type="submit">Continuar</button>
        <p className="hint">Simulación de la demo: no se mueve dinero real.</p>
      </form>
    </section>
  );
}

/** Aviso de Mío antes de pagar: cómo quedarías a fin de mes. */
function MioRevisa({ finDeMes, ambito }: { finDeMes: number; ambito: 'personal' | 'negocio' }) {
  if (ambito === 'negocio') {
    return <p className="mio-revisa mio-revisa--verde"><b>Mío:</b> lo registro como gasto del negocio, así no se mezcla con tus finanzas personales.</p>;
  }
  const nivel = finDeMes < 0 ? 'rojo' : finDeMes < 150 ? 'amarillo' : 'verde';
  const texto =
    nivel === 'rojo' ? `con este pago no llegarías a fin de mes: te faltarían ${soles(-finDeMes, 0)}.`
    : nivel === 'amarillo' ? `llegas justo a fin de mes: te quedarían unos ${soles(finDeMes, 0)}.`
    : `vas bien: a fin de mes te quedarían unos ${soles(finDeMes, 0)}.`;
  return <p className={`mio-revisa mio-revisa--${nivel}`} role="status"><b>Mío:</b> {texto}</p>;
}
