import { NextResponse } from 'next/server';
import { definirMeta } from '@/lib/metas';
import { crearMetaAhorro, separarAhorro } from '@/lib/ahorro';
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
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
