import { Chat } from '@/components/Chat';

export const metadata = { title: 'Boot' };

export default async function BootPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  return <Chat preguntaInicial={typeof q === 'string' ? q.slice(0, 300) : undefined} />;
}
