import { after, NextResponse } from 'next/server';
import { cargarEstadoFresco, guardarEstado } from '@/lib/estado';
import { avisarRecibida } from '@/lib/notificaciones';
import { recibirTransferencia } from '@/lib/operaciones';
import { enviarPush, suscritos } from '@/lib/push';
import { sesionActual } from '@/lib/sesion-servidor';

export const maxDuration = 60; // el aviso con retraso sigue corriendo después de responder

// Demo: POST { tipo: 'recibida' | 'prueba', retraso?: segundos }.
// Con retraso, da tiempo a bloquear el celular o salir de la app para ver llegar la notificación.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { perfil } = await sesionActual();
  if (!suscritos(perfil)) return NextResponse.json({ ok: false, error: 'Activa primero las notificaciones en este dispositivo.' }, { status: 400 });
  const retraso = Math.min(30, Math.max(0, Number(body?.retraso) || 0)) * 1000;

  const tarea = async () => {
    if (body?.tipo !== 'recibida') {
      return enviarPush(perfil, { title: 'Notificaciones activas', body: 'Así te avisará Numa de tus pagos, transferencias y metas.', url: '/app' });
    }
    await cargarEstadoFresco(); // pudo cambiar mientras esperábamos
    const r = recibirTransferencia(perfil);
    await guardarEstado();
    return avisarRecibida(perfil, r);
  };

  if (retraso) {
    // after(): en Vercel la función sigue viva hasta terminar esto, aunque ya se respondió.
    after(async () => {
      await new Promise((ok) => setTimeout(ok, retraso));
      await tarea();
    });
    return NextResponse.json({ ok: true, retraso: retraso / 1000 });
  }
  return NextResponse.json({ ok: true, enviados: await tarea() });
}
