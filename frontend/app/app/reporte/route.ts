import { datosReporte, htmlReporte } from '@/lib/reporte';
import { sesionActual } from '@/lib/sesion-servidor';

// GET /app/reporte → el correo de cierre del mes tal como llegaría, para verlo en el navegador.
export async function GET() {
  const { perfil } = await sesionActual();
  return new Response(htmlReporte(datosReporte(perfil)), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
