'use client';

import { useEffect } from 'react';

/** Registra el service worker para instalar Mío como app (no dentro de la vitrina del teléfono). */
export function RegistrarSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || window.self !== window.top) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sin HTTPS o sin soporte: la web sigue funcionando igual */
    });
  }, []);
  return null;
}
