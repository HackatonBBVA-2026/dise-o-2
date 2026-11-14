import { Chat } from '@/components/Chat';
import { sesionActual } from '@/lib/sesion-servidor';

export const metadata = { title: 'Boot' };

export default async function BootPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  const { perfil } = await sesionActual();
  return <Chat perfil={perfil} preguntaInicial={typeof q === 'string' ? q.slice(0, 300) : undefined} />;
}
