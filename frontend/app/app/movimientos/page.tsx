import Link from 'next/link';
import { MovimientosView } from '@/components/MovimientosView';
import { Money } from '@/components/Money';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';
import { sesionActual } from '@/lib/sesion-servidor';

export const metadata = { title: 'Movimientos' };

/** Movimientos del mes, incluidas las transferencias y pagos hechos desde la app. */
export const dynamic = 'force-dynamic';

export default async function MovimientosPage() {
  await sesionActual(); // trae el estado de la demo
  const r = getResumen();
  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">Disponible <Money>{soles(r.disponible)}</Money></p>
          <h1>Movimientos</h1>
        </div>
        <Link className="btn-sm" href="/app/operar?tipo=cuenta">Transferir</Link>
      </header>
      <MovimientosView duplicados={r.duplicados.map((d) => d.comercio)} />
    </>
  );
}
