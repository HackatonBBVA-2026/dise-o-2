'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './Providers';
import { useClasificacion } from './Clasificacion';

/** Deja la demo como nueva antes de presentar: datos del servidor y clasificaciones de este navegador. */
export function ReiniciarDemo() {
  const router = useRouter();
  const { toast } = useApp();
  const { restablecer } = useClasificacion();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      className="btn btn--ghost"
      type="button"
      disabled={ocupado}
      onClick={async () => {
        if (!window.confirm('¿Volver la demo a sus datos iniciales? Se borran los pagos, metas y ahorros de prueba.')) return;
        setOcupado(true);
        try {
          const r = await fetch('/api/demo', { method: 'POST' });
          if (!r.ok) throw new Error();
          restablecer();
          toast('Demo reiniciada.');
          router.refresh();
        } catch {
          toast('No se pudo reiniciar la demo.');
        } finally {
          setOcupado(false);
        }
      }}
    >
      Reiniciar datos de la demo
    </button>
  );
}
