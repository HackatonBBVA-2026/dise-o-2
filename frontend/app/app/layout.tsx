import '@/styles/app.css';
import { ClasificacionProvider } from '@/components/Clasificacion';
import { Nav } from '@/components/Nav';
import { SincronizarPush } from '@/components/Notificaciones';
import { Providers } from '@/components/Providers';
import { alertasDe } from '@/lib/alertas';
import { prediccionesServidor } from '@/lib/clasificacion';
import { movimientos } from '@/lib/data';
import { disponible } from '@/lib/finanzas';
import { operaciones } from '@/lib/operaciones';
import { sesionActual } from '@/lib/sesion-servidor';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await sesionActual();
  const alertasCount = alertasDe(perfil).length;
  const ops = [...operaciones()];
  // El modelo de ML corre en el servidor; al navegador solo llegan sus predicciones.
  const predicciones = prediccionesServidor([...ops, ...movimientos]);
  return (
    <ClasificacionProvider perfil={perfil} operaciones={ops} saldo={disponible()} predicciones={predicciones}>
      <Providers>
        <div className="wrap">{children}</div>
        <Nav alertasCount={alertasCount} />
        <SincronizarPush />
      </Providers>
    </ClasificacionProvider>
  );
}
