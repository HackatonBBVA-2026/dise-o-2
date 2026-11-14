'use client';

import { useEffect, useRef, useState } from 'react';
import { BootAvatar } from './BootAvatar';
import { IconFlecha } from './icons';
import type { RespuestaBoot } from '@/lib/types';
import type { Perfil } from '@/lib/sesion';

type Mensaje =
  | { id: number; de: 'usuario'; texto: string }
  | { id: number; de: 'boot'; r: RespuestaBoot }
  | { id: number; de: 'escribiendo' };

const BIENVENIDA: RespuestaBoot = {
  texto: ['Hola, soy Boot. Pregúntame antes de gastar y hago la cuenta con tus movimientos.'],
};

const CHIPS_INICIALES = {
  persona: ['¿Llego a fin de mes?', '¿Puedo gastar S/ 200 en unas zapatillas?', '¿Qué ofertas puedo desbloquear?', 'Mis suscripciones'],
  empresa: ['¿Cuánto gané este mes en el negocio?', '¿Puedo reponer stock por S/ 500?', '¿Llego a fin de mes?', '¿Qué ofertas puedo desbloquear?'],
};

/** Pestaña Boot: el cliente solo envía la pregunta y pinta la respuesta calculada en el servidor. */
export function Chat({ preguntaInicial, perfil = 'persona' }: { preguntaInicial?: string; perfil?: Perfil }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ id: 0, de: 'boot', r: BIENVENIDA }]);
  const [chips, setChips] = useState<string[]>(CHIPS_INICIALES[perfil]);
  const [texto, setTexto] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);
  const enviada = useRef(false);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [mensajes]);

  async function enviar(pregunta: string) {
    const q = pregunta.trim();
    if (!q) return;
    const idEsc = idRef.current + 1;
    setMensajes((m) => [...m, { id: idRef.current++, de: 'usuario', texto: q }, { id: idRef.current++, de: 'escribiendo' }]);
    let r: RespuestaBoot;
    try {
      const res = await fetch('/api/boot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: q }),
      });
      r = await res.json();
    } catch {
      r = { texto: ['No pude conectarme. Inténtalo de nuevo en un momento.'] };
    }
    setMensajes((m) => [...m.filter((x) => x.id !== idEsc), { id: idRef.current++, de: 'boot', r }]);
    if (r.chips) setChips(r.chips);
  }

  // Pregunta que llega desde otra pantalla (/app/boot?q=…): se envía una sola vez y se limpia la URL.
  useEffect(() => {
    if (!preguntaInicial || enviada.current) return;
    enviada.current = true;
    history.replaceState(null, '', '/app/boot');
    enviar(preguntaInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaInicial]);

  return (
    <section className="chat" aria-labelledby="bootTitle">
      <header className="chat__head">
        <span className="chat__avatar"><BootAvatar /></span>
        <div>
          <h1 id="bootTitle">Boot</h1>
          <p><span className="live-dot" aria-hidden="true" />Asistente con IA · en línea</p>
        </div>
      </header>

      <div className="chat__log" ref={logRef} aria-live="polite">
        {mensajes.map((m) =>
          m.de === 'usuario' ? (
            <div key={m.id} className="msg msg--user">{m.texto}</div>
          ) : m.de === 'escribiendo' ? (
            <div key={m.id} className="msg msg--bot msg--typing">Boot está calculando…</div>
          ) : (
            <Respuesta key={m.id} r={m.r} />
          )
        )}
      </div>

      <div className="chat__chips">
        {chips.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => enviar(c)}>{c}</button>
        ))}
      </div>

      <form
        className="chat__form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
          setTexto('');
        }}
      >
        <label className="sr-only" htmlFor="bootInput">Escribe tu pregunta</label>
        <input id="bootInput" type="text" placeholder="Pregúntale a Boot" maxLength={300} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" aria-label="Enviar"><IconFlecha size={18} stroke={2} /></button>
      </form>
      <p className="chat__legal">Información y simulaciones, no asesoría. La decisión es tuya.</p>
    </section>
  );
}

function Respuesta({ r }: { r: RespuestaBoot }) {
  return (
    <div className="msg msg--bot">
      {r.texto?.map((t, i) => <p key={i}>{t}</p>)}
      {r.lista && <ol>{r.lista.map((t, i) => <li key={i}>{t}</li>)}</ol>}
      {r.tabla && (
        <table>
          <tbody>
            {r.tabla.map((f, i) => (
              <tr key={i}>
                <td>{f.label}</td>
                <td className={f.tono ? `t-${f.tono}` : undefined}>{f.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {r.nota && <p>{r.nota}</p>}
      {r.fuente && <p className="msg__fuente">{r.fuente === 'groq' ? 'IA · calculado con tus movimientos' : 'Respuesta rápida (sin IA)'}</p>}
    </div>
  );
}
