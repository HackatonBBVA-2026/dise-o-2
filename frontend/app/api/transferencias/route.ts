import { NextResponse } from 'next/server';
import { validarTransferencia } from '@/lib/finanzas';

// Transferencia de demostración: valida, pero no mueve dinero ni guarda nada.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const resultado = validarTransferencia(body ?? {});
  return NextResponse.json(resultado, { status: resultado.ok ? 200 : 400 });
}
