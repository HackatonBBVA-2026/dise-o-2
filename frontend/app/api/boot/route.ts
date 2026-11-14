import { NextResponse } from 'next/server';
import { responder } from '@/lib/boot';

// Boot: el código calcula, la "IA" solo explica.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mensaje = String(body?.mensaje ?? '').slice(0, 300);
  return NextResponse.json(responder(mensaje));
}
