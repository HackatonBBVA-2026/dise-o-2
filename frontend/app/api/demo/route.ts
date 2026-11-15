import { NextResponse } from 'next/server';
import { reiniciarEstado } from '@/lib/estado';
import { sesionActual } from '@/lib/sesion-servidor';

// POST: vuelve la demo a sus datos iniciales (saldo, movimientos, metas, ahorro). Los celulares con notificaciones se mantienen.
export async function POST() {
  await sesionActual();
  await reiniciarEstado();
  return NextResponse.json({ ok: true });
}
