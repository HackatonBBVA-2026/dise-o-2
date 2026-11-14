'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CerrarSesion() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await fetch('/api/sesion', { method: 'DELETE' }).catch(() => null);
    router.replace('/login');
    router.refresh();
  }

  return (
    <button type="button" className="btn btn--danger" onClick={salir} disabled={saliendo}>
      {saliendo ? 'Cerrando…' : 'Cerrar sesión'}
    </button>
  );
}
