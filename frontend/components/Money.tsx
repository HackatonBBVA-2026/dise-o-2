'use client';

import { useApp } from './Providers';

/** Monto que respeta el modo privado: muestra puntos en lugar de la cifra. */
export function Money({ children, className }: { children: React.ReactNode; className?: string }) {
  const { prefs } = useApp();
  return <span className={['money', className].filter(Boolean).join(' ')}>{prefs.ocultarSaldos ? 'S/ ••••••' : children}</span>;
}

/** Botón que activa o desactiva el modo privado (el saldo de Inicio). */
export function PrivacyToggle({ children, className }: { children: React.ReactNode; className?: string }) {
  const { prefs, setPref } = useApp();
  return (
    <button
      type="button"
      className={className}
      aria-pressed={prefs.ocultarSaldos}
      onClick={() => setPref('ocultarSaldos', !prefs.ocultarSaldos)}
    >
      {children}
    </button>
  );
}
