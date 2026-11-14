'use client';

import { useEffect, useRef, useState } from 'react';

/** Modelo de teléfono: se escala para caber en la ventana y muestra la hora real. */
export function Device() {
  const slotRef = useRef<HTMLDivElement>(null);
  const deviceRef = useRef<HTMLDivElement>(null);
  const [hora, setHora] = useState('9:41');

  useEffect(() => {
    // En un celular real se abre la app directamente, sin el marco.
    if (window.matchMedia('(max-width: 540px)').matches) {
      location.replace('/app');
      return;
    }

    const escalar = () => {
      const device = deviceRef.current;
      const slot = slotRef.current;
      if (!device || !slot) return;
      const w = device.offsetWidth;
      const h = device.offsetHeight;
      const s = Math.min(1, (window.innerHeight - 48) / h, (window.innerWidth - 48) / w);
      device.style.setProperty('--s', s.toFixed(4));
      slot.style.width = `${w * s}px`;
      slot.style.height = `${h * s}px`;
    };
    const tic = () => {
      const d = new Date();
      setHora(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
    };

    escalar();
    tic();
    window.addEventListener('resize', escalar);
    const reloj = setInterval(tic, 15000);
    return () => {
      window.removeEventListener('resize', escalar);
      clearInterval(reloj);
    };
  }, []);

  return (
    <div className="device-slot" ref={slotRef}>
      <div className="device" ref={deviceRef}>
        <span className="device__btn device__btn--action" aria-hidden="true" />
        <span className="device__btn device__btn--vol-up" aria-hidden="true" />
        <span className="device__btn device__btn--vol-down" aria-hidden="true" />
        <span className="device__btn device__btn--power" aria-hidden="true" />

        <div className="screen">
          <div className="statusbar" aria-hidden="true">
            <span className="statusbar__time">{hora}</span>
            <span className="island" />
            <span className="statusbar__icons">
              <svg viewBox="0 0 18 12" width="18" height="12">
                <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                <rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" />
              </svg>
              <span className="statusbar__net">5G</span>
              <svg viewBox="0 0 27 13" width="27" height="13">
                <rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".45" />
                <rect x="2" y="2" width="17" height="9" rx="2" />
                <path d="M25 4.5v4c.8-.3 1.5-1 1.5-2s-.7-1.7-1.5-2z" opacity=".45" />
              </svg>
            </span>
          </div>
          <iframe className="screen__app" src="/app" title="Prototipo de la app Boot" />
          <span className="home-indicator" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
