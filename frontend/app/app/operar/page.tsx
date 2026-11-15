import { Money } from '@/components/Money';
import { OperarView } from '@/components/OperarView';
import { disponible } from '@/lib/finanzas';
import { soles } from '@/lib/format';
import { CONTACTOS, LIMITE_CELULAR } from '@/lib/operaciones';
import { sesionActual } from '@/lib/sesion-servidor';

export const metadata = { title: 'Transferir y pagar' };
export const dynamic = 'force-dynamic'; // el saldo cambia con cada operación

/** Transferencias y pagos a celular (simulados). */
export default async function OperarPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  await sesionActual(); // trae el estado de la demo
  const saldo = disponible();
  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">Disponible <Money>{soles(saldo)}</Money></p>
          <h1>Transferir y pagar</h1>
        </div>
      </header>
      <OperarView disponible={saldo} contactos={CONTACTOS} limiteCelular={LIMITE_CELULAR} tipoInicial={tipo === 'cuenta' ? 'cuenta' : 'celular'} />
    </>
  );
}
