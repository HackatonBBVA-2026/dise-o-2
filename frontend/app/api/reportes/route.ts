import { NextResponse } from 'next/server';
import { asuntoReporte, datosReporte, htmlReporte, textoReporte } from '@/lib/reporte';
import { nombrePdf, pdfReporte } from '@/lib/reporte-pdf';
import { sesionActual } from '@/lib/sesion-servidor';

// POST { correo } → envía el cierre del mes por correo con Resend (https://resend.com):
// el cuerpo es un resumen corto y el detalle completo va adjunto en PDF.
// Sin RESEND_API_KEY no envía nada: responde en modo demo para que la app muestre la vista previa.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const correo = String(body?.correo ?? '').trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) {
    return NextResponse.json({ ok: false, error: 'Escribe un correo válido.' }, { status: 400 });
  }

  const { perfil } = await sesionActual();
  const d = datosReporte(perfil);
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    return NextResponse.json({
      ok: true,
      enviado: false,
      mensaje: 'Modo demo: el correo no se envió porque falta configurar RESEND_API_KEY. Mira la vista previa.',
      vistaPrevia: '/app/reporte',
      pdf: '/app/reporte/pdf',
    });
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
      body: JSON.stringify({
        from: process.env.REPORTE_REMITENTE || 'Numa <onboarding@resend.dev>',
        to: [correo],
        subject: asuntoReporte(d),
        html: htmlReporte(d),
        text: textoReporte(d),
        attachments: [{ filename: nombrePdf(d), content: Buffer.from(await pdfReporte(d)).toString('base64') }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn('[Reportes] Resend respondió', res.status, (await res.text()).slice(0, 200));
      return NextResponse.json({ ok: false, error: 'El servicio de correo no aceptó el envío. Revisa la configuración.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true, enviado: true, mensaje: `Listo: enviamos tu resumen a ${correo}.` });
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo conectar con el servicio de correo.' }, { status: 502 });
  }
}
