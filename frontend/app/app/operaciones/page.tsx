import { OperacionesView } from '@/components/OperacionesView';
import { Money } from '@/components/Money';
import { cuentas, tipoCambio } from '@/lib/data';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';

export const metadata = { title: 'Operaciones' };

export default function OperacionesPage() {
  const r = getResumen();
  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">Disponible <Money>{soles(r.disponible)}</Money></p>
          <h1>Operaciones</h1>
        </div>
      </header>
      <OperacionesView
        duplicados={r.duplicados.map((d) => d.comercio)}
        cuentas={cuentas}
        tipoCambio={tipoCambio}
      />
    </>
  );
}
