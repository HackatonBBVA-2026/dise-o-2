import { NextResponse } from 'next/server';
import { definirMeta } from '@/lib/metas';
import { crearMetaAhorro, separarAhorro } from '@/lib/ahorro';
import { avisarMetasGasto, avisarOfertas, reiniciarAvisoMeta } from '@/lib/notificaciones';
import { guardarEstado } from '@/lib/estado';
import { sesionActual } from '@/lib/sesion-servidor';

// POST { accion: 'gasto' | 'ahorro' | 'separar', ... } — cada perfil guarda sus propias metas (simulación).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { perfil } = await sesionActual();
  const r =
    body?.accion === 'gasto' ? definirMeta(perfil, body.categoria, body.limite)
    : body?.accion === 'ahorro' ? crearMetaAhorro(perfil, body.nombre, body.objetivo)
    : body?.accion === 'separar' ? separarAhorro(perfil, body.nombre, body.monto)
    : { ok: false as const, error: 'Acción no válida.' };
  if (r.ok) {
    // Push: una meta nueva que ya está cerca del límite, u ofertas desbloqueadas al ahorrar.
    if (body?.accion === 'gasto' && 'meta' in r && r.meta && 'categoria' in r.meta) {
      reiniciarAvisoMeta(perfil, r.meta.categoria);
      await avisarMetasGasto(perfil);
    }
    const nuevas = 'ofertasNuevas' in r ? (r.ofertasNuevas as { titulo: string; beneficio: string }[]) : [];
    if (nuevas.length) await avisarOfertas(perfil, nuevas);
  }
  if (r.ok) await guardarEstado();
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
