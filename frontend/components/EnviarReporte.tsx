'use client';

import { useState } from 'react';
import { useApp } from './Providers';

/** Perfil › Reportes: enviar el resumen del mes por correo o verlo antes. */
export function EnviarReporte() {
  const { toast } = useApp();
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAviso(null);
    try {
      const res = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo }),
      });
      const r = await res.json();
      if (!r.ok) setAviso(r.error ?? 'No se pudo enviar.');
      else if (r.enviado) toast(r.mensaje);
      else setAviso(r.mensaje);
    } catch {
      setAviso('No pude conectarme. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form className="form form--inline" onSubmit={enviar} noValidate>
      <p className="hint">Un correo corto con cómo te fue y qué revisar, y tu estado del mes en PDF adjunto con todos tus movimientos.</p>
      <div className="field">
        <label htmlFor="repCorreo">Enviar a</label>
        <input id="repCorreo" className="input" type="email" inputMode="email" autoComplete="email" placeholder="tu@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
      </div>
      {aviso && <p className="hint" role="status">{aviso}</p>}
      <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mi resumen del mes'}</button>
      <a className="btn btn--ghost" href="/app/reporte" target="_blank" rel="noopener">Ver cómo se ve el correo</a>
      <a className="btn btn--ghost" href="/app/reporte/pdf" target="_blank" rel="noopener">Ver el PDF adjunto</a>
    </form>
  );
}
