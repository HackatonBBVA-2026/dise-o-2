import { MovimientosView } from '@/components/MovimientosView';
import { Money } from '@/components/Money';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';

export const metadata = { title: 'Movimientos' };

/** Consulta de movimientos (la app es de gestión: no hace transferencias ni pagos). */
export default function MovimientosPage() {
  const r = getResumen();
  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">Disponible <Money>{soles(r.disponible)}</Money></p>
          <h1>Movimientos</h1>
        </div>
      </header>
      <MovimientosView duplicados={r.duplicados.map((d) => d.comercio)} />
    </>
  );
}
