import { NextResponse } from 'next/server';
import { avisarOperacion } from '@/lib/notificaciones';
import { realizarOperacion } from '@/lib/operaciones';
import { guardarEstado } from '@/lib/estado';
import { sesionActual } from '@/lib/sesion-servidor';

// POST { tipo: 'celular' | 'cuenta', monto, celular? | cuenta? + titular?, nota?, ambito? }
// Simulación: descuenta del saldo de la demo y registra el movimiento; no mueve dinero real.
// Si el dispositivo activó las notificaciones, llega un push con la constancia (y otro si una meta de gasto llega al 80%).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { perfil } = await sesionActual();
  const r = realizarOperacion(body && typeof body === 'object' ? body : {}, perfil);
  if (r.ok) {
    await avisarOperacion(perfil, r.constancia);
    await guardarEstado();
  }
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
