import { NextResponse } from 'next/server';
import { responder } from '@/lib/boot';
import { iaActiva, responderConIA } from '@/lib/llm';
import { sesionActual } from '@/lib/sesion-servidor';

const CHIPS = {
  persona: ['¿Llego a fin de mes?', '¿Qué ofertas puedo desbloquear?', '¿Cómo va mi ahorro?'],
  empresa: ['¿Cuánto gané este mes en el negocio?', '¿Puedo reponer stock por S/ 500?', '¿Qué ofertas puedo desbloquear?'],
};

// Boot: el código calcula y la IA (Groq) solo redacta, según el perfil de la sesión.
// Sin GROQ_API_KEY, o si Groq falla o tarda, responde el motor de reglas.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mensaje = String(body?.mensaje ?? '').slice(0, 300);
  const { perfil } = await sesionActual();

  if (iaActiva() && mensaje.trim()) {
    try {
      const r = await responderConIA(mensaje, perfil);
      return NextResponse.json({ ...r, chips: CHIPS[perfil] });
    } catch (e) {
      console.warn('[Boot] Groq no respondió, uso reglas:', (e as Error).message);
    }
  }
  return NextResponse.json({ ...responder(mensaje), fuente: 'reglas' });
}
