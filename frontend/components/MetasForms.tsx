'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './Providers';

type Accion = 'gasto' | 'ahorro' | 'separar';

/** Envía una acción de metas a la API y refresca la pantalla con los datos del servidor. */
function useGuardar() {
  const router = useRouter();
  const { toast } = useApp();
  const [enviando, setEnviando] = useState(false);

  async function guardar(accion: Accion, datos: Record<string, string>) {
    setEnviando(true);
    try {
      const res = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, ...datos }),
      });
      const r = await res.json();
      if (!r.ok) {
        toast(r.error ?? 'No se pudo guardar.');
        return false;
      }
      const nuevas: { titulo: string }[] = r.ofertasNuevas ?? [];
      toast(nuevas.length ? `¡Desbloqueaste: ${nuevas.map((o) => o.titulo).join(', ')}!` : 'Guardado.');
      router.refresh();
      return true;
    } catch {
      toast('No pude conectarme. Inténtalo de nuevo.');
      return false;
    } finally {
      setEnviando(false);
    }
  }
  return { guardar, enviando };
}

export function FormMetaGasto({ categorias }: { categorias: string[] }) {
  const { guardar, enviando } = useGuardar();
  const [categoria, setCategoria] = useState(categorias[0] ?? '');
  const [limite, setLimite] = useState('');
  return (
    <form
      className="form form--inline"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await guardar('gasto', { categoria, limite })) setLimite('');
      }}
    >
      <div className="field">
        <label htmlFor="gCat">Categoría</label>
        <select id="gCat" className="input" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="gLim">Límite al mes (S/)</label>
        <input id="gLim" className="input" type="number" inputMode="decimal" min={1} placeholder="300" value={limite} onChange={(e) => setLimite(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={enviando}>Guardar meta de gasto</button>
    </form>
  );
}

export function FormMetaAhorro() {
  const { guardar, enviando } = useGuardar();
  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  return (
    <form
      className="form form--inline"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await guardar('ahorro', { nombre, objetivo })) {
          setNombre('');
          setObjetivo('');
        }
      }}
    >
      <div className="field">
        <label htmlFor="aNom">Nueva meta</label>
        <input id="aNom" className="input" maxLength={40} placeholder="Ej. Laptop" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="aObj">Objetivo (S/)</label>
        <input id="aObj" className="input" type="number" inputMode="decimal" min={1} placeholder="2000" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
      </div>
      <button className="btn" type="submit" disabled={enviando}>Crear meta de ahorro</button>
    </form>
  );
}

export function FormSeparar({ nombre }: { nombre: string }) {
  const { guardar, enviando } = useGuardar();
  const [monto, setMonto] = useState('');
  return (
    <form
      className="meta__aporte"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        if (await guardar('separar', { nombre, monto })) setMonto('');
      }}
    >
      <label className="sr-only" htmlFor={`ap-${nombre}`}>Monto a separar para {nombre}</label>
      <input id={`ap-${nombre}`} className="input" type="number" inputMode="decimal" min={1} placeholder="S/ 100" value={monto} onChange={(e) => setMonto(e.target.value)} />
      <button className="btn-sm" type="submit" disabled={enviando}>Separar</button>
    </form>
  );
}
