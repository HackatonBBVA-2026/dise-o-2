import '@/styles/app.css';
import { ClasificacionProvider } from '@/components/Clasificacion';
import { Nav } from '@/components/Nav';
import { Providers } from '@/components/Providers';
import { getResumen } from '@/lib/finanzas';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const alertasCount = getResumen().alertas.length;
  return (
    <ClasificacionProvider>
      <Providers>
        <div className="wrap">{children}</div>
        <Nav alertasCount={alertasCount} />
      </Providers>
    </ClasificacionProvider>
  );
}
