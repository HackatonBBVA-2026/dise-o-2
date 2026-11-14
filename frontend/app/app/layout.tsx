import '@/styles/app.css';
import { ClasificacionProvider } from '@/components/Clasificacion';
import { Nav } from '@/components/Nav';
import { Providers } from '@/components/Providers';
import { alertasDe } from '@/lib/alertas';
import { sesionActual } from '@/lib/sesion-servidor';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil } = await sesionActual();
  const alertasCount = alertasDe(perfil).length;
  return (
    <ClasificacionProvider perfil={perfil}>
      <Providers>
        <div className="wrap">{children}</div>
        <Nav alertasCount={alertasCount} />
      </Providers>
    </ClasificacionProvider>
  );
}
