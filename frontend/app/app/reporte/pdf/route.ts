import { datosReporte } from '@/lib/reporte';
import { nombrePdf, pdfReporte } from '@/lib/reporte-pdf';
import { sesionActual } from '@/lib/sesion-servidor';

// GET /app/reporte/pdf → el estado del mes en PDF, el mismo que va adjunto al correo.
export async function GET() {
  const { perfil } = await sesionActual();
  const d = datosReporte(perfil);
  const pdf = await pdfReporte(d);
  return new Response(Buffer.from(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${nombrePdf(d)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
