import { NextResponse } from 'next/server';
import { avisarMetasGasto } from '@/lib/notificaciones';
import { clavePublica, desuscribir, pushDisponible, suscribir, suscritos } from '@/lib/push';
import { guardarEstado } from '@/lib/estado';
import { sesionActual } from '@/lib/sesion-servidor';

// GET: clave pública para suscribirse · POST { subscription }: registrar este dispositivo · DELETE { endpoint }: darlo de baja.
export async function GET() {
  const { perfil } = await sesionActual();
  return NextResponse.json({ disponible: pushDisponible(), clave: clavePublica(), dispositivos: suscritos(perfil) });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { perfil } = await sesionActual();
  if (!pushDisponible()) return NextResponse.json({ ok: false, error: 'Las notificaciones no están configuradas en el servidor.' }, { status: 503 });
  if (!suscribir(perfil, body?.subscription)) return NextResponse.json({ ok: false, error: 'Suscripción no válida.' }, { status: 400 });
  await guardarEstado();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  await sesionActual();
  desuscribir(body?.endpoint);
  await guardarEstado();
  return NextResponse.json({ ok: true });
}

// Al activar, revisa de una vez si alguna meta ya está cerca del límite.
export async function PUT() {
  const { perfil } = await sesionActual();
  await avisarMetasGasto(perfil);
  await guardarEstado();
  return NextResponse.json({ ok: true });
}
