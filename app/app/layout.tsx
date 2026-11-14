import '@/styles/app.css';
import { Nav } from '@/components/Nav';
import { Providers } from '@/components/Providers';
import { getResumen } from '@/lib/finanzas';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const avisosCount = getResumen().alertas.length;
  return (
    <Providers>
      <div className="wrap">{children}</div>
      <Nav avisosCount={avisosCount} />
    </Providers>
  );
}
