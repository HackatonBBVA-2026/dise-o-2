import { NextResponse } from 'next/server';
import { COOKIE_SESION, DURACION_SESION, codificarSesion, validarDocumento } from '@/lib/sesion';

// Inicio de sesión de demostración: el documento decide el perfil. La clave no se guarda ni se valida.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = validarDocumento(body?.documento);
  if (!r.ok) return NextResponse.json(r, { status: 400 });
  if (!String(body?.clave ?? '').trim()) {
    return NextResponse.json({ ok: false, error: 'Ingresa tu clave.' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, perfil: r.sesion.perfil });
  res.cookies.set(COOKIE_SESION, codificarSesion(r.sesion), {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: DURACION_SESION,
  });
  return res;
}

// Cerrar sesión.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_SESION);
  return res;
}
