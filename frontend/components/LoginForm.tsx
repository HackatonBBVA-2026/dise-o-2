'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEMO } from '@/lib/sesion';

/** Inicio de sesión: con DNI entras como persona; con RUC, como emprendedor o empresa. */
export function LoginForm() {
  const router = useRouter();
  const [documento, setDocumento] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const digitos = documento.replace(/\D/g, '');
  const tipo = digitos.length === 11 ? 'RUC · Emprendedor o empresa' : digitos.length === 8 ? 'DNI · Persona' : null;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const res = await fetch('/api/sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento: digitos, clave }),
      });
      const r = await res.json();
      if (!r.ok) {
        setError(r.error ?? 'No se pudo iniciar sesión.');
        setEnviando(false);
        return;
      }
      router.replace('/app');
      router.refresh();
    } catch {
      setError('No pude conectarme. Inténtalo de nuevo.');
      setEnviando(false);
    }
  }

  const usarDemo = (doc: string) => {
    setDocumento(doc);
    setClave('123456');
    setError('');
  };

  return (
    <div className="login__card">
      <div className="login__brand">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo estático pequeño */}
        <img className="login__logo" src="/icons/numa-logo.png" alt="Logo de Numa" width={72} height={72} />
        <h1>Numa</h1>
        <p className="hint">Tus finanzas con Mío, tu asistente con IA.</p>
      </div>

      <form className="form" onSubmit={entrar} noValidate>
        <div className="field">
          <label htmlFor="doc">DNI o RUC</label>
          <input
            id="doc"
            className="input mono"
            inputMode="numeric"
            autoComplete="username"
            maxLength={11}
            placeholder="8 u 11 dígitos"
            value={documento}
            onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 11))}
            required
          />
          <small className="login__tipo" aria-live="polite">{tipo ?? 'Con DNI entras como persona; con RUC, como negocio.'}</small>
        </div>
        <div className="field">
          <label htmlFor="clave">Clave de internet</label>
          <input
            id="clave"
            className="input"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            placeholder="••••••"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
          />
        </div>
        {error && <p className="login__error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
      </form>

      <div className="login__demo">
        <p className="eyebrow">Probar la demo</p>
        <div className="login__demo-btns">
          <button type="button" className="chip" onClick={() => usarDemo(DEMO.dni)}>Persona · DNI {DEMO.dni}</button>
          <button type="button" className="chip" onClick={() => usarDemo(DEMO.ruc)}>Negocio · RUC {DEMO.ruc}</button>
        </div>
        <p className="hint">Prototipo con datos ficticios para el Hackathon BBVA AI Financial Life. No es un producto oficial; no ingreses tus datos reales.</p>
      </div>
    </div>
  );
}
