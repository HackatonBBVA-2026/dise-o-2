import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SESION, leerSesion } from '@/lib/sesion';

// Sin sesión no se entra a la app: se va a /login (las API responden 401).
// /login siempre muestra el formulario (DNI o RUC): es la primera pantalla de la app.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sesion = leerSesion(request.cookies.get(COOKIE_SESION)?.value);

  if (pathname === '/login') return NextResponse.next();
  if (sesion) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Inicia sesión para continuar.' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // /api/sesion queda libre para poder iniciar y cerrar sesión.
  matcher: ['/login', '/app/:path*', '/api/boot', '/api/metas', '/api/reportes', '/api/operaciones', '/api/push', '/api/push/:path*', '/api/demo'],
};
