'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface Prefs {
  ocultarSaldos: boolean;
  avisosBoot: boolean;
  push: boolean;
}

const DEFAULT: Prefs = { ocultarSaldos: false, avisosBoot: true, push: true };
const KEY = 'boot.prefs';

interface Ctx {
  prefs: Prefs;
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => void;
  toast: (msg: string) => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp debe usarse dentro de <Providers>');
  return ctx;
}

/** Preferencias del usuario (guardadas en este navegador), toast y botones de demostración. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pathname = usePathname();

  // Se leen después de montar para que el HTML del servidor y el del cliente coincidan.
  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem(KEY) || '{}');
      setPrefs((p) => ({ ...p, ...guardadas }));
    } catch {
      /* modo privado o datos corruptos: se usan los valores por defecto */
    }
  }, []);

  const setPref = useCallback<Ctx['setPref']>((k, v) => {
    setPrefs((p) => {
      const nuevas = { ...p, [k]: v };
      try { localStorage.setItem(KEY, JSON.stringify(nuevas)); } catch { /* sin almacenamiento */ }
      return nuevas;
    });
  }, []);

  const toast = useCallback((msg: string) => {
    setMensaje(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMensaje(null), 2800);
  }, []);

  // Cualquier elemento con data-demo muestra un aviso de función no disponible.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-demo]');
      if (el) toast(`Demo: "${el.dataset.demo}" estaría disponible en la versión oficial.`);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [toast]);

  const clases = [
    'page',
    pathname === '/app/boot' ? 'page--boot' : '',
    prefs.ocultarSaldos ? 'ocultar-saldos' : '',
    prefs.avisosBoot ? '' : 'sin-avisos',
  ].filter(Boolean).join(' ');

  return (
    <AppCtx.Provider value={{ prefs, setPref, toast }}>
      <div className={clases}>{children}</div>
      {mensaje && <div className="toast" role="status" aria-live="polite">{mensaje}</div>}
    </AppCtx.Provider>
  );
}
