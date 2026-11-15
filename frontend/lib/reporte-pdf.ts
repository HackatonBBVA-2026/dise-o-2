// Estado del mes en PDF: el detalle completo que va adjunto al correo (para guardar, imprimir o pasarle al contador).
// Se genera en el servidor con pdf-lib (JavaScript puro, sin navegador). SOLO SERVIDOR.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { r2, soles } from './format';
import type { DatosReporte } from './reporte';

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // margen
const TINTA = rgb(0.043, 0.043, 0.047);
const GRIS = rgb(0.42, 0.45, 0.5);
const LINEA = rgb(0.9, 0.9, 0.91);
const SUAVE = rgb(0.96, 0.96, 0.96);
const VERDE = rgb(0.08, 0.5, 0.24);
const NARANJA = rgb(0.76, 0.25, 0.05);

// Las fuentes estándar de PDF solo tienen caracteres latinos: sin emojis y con el signo menos normal.
const limpio = (t: unknown) =>
  String(t ?? '')
    .replace(/−/g, '-')
    .replace(/[^ -ÿ•…–—‘’“”€]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const S = (n: number) => limpio(soles(n));

export function nombrePdf(d: DatosReporte) {
  const quien = d.negocio ? d.negocioNombre : d.nombre;
  return `Numa_estado_${d.mes}_${quien.replace(/\s+/g, '_')}.pdf`;
}

export async function pdfReporte(d: DatosReporte): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Numa · Estado de ${d.mes}`);
  doc.setAuthor('Numa (concepto con datos ficticios)');
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([A4.w, A4.h]);
  let y = A4.h - M;

  const texto = (t: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(limpio(t), { x, y: yy, size: o.size ?? 10, font: o.font ?? normal, color: o.color ?? TINTA });
  const derecha = (t: string, xDer: number, yy: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) => {
    const f = o.font ?? normal;
    const s = o.size ?? 10;
    texto(t, xDer - f.widthOfTextAtSize(limpio(t), s), yy, o);
  };
  const raya = (yy: number, color = LINEA) => page.drawLine({ start: { x: M, y: yy }, end: { x: A4.w - M, y: yy }, thickness: 0.7, color });
  /** Salta de página si no caben `alto` puntos más. */
  const espacio = (alto: number) => {
    if (y - alto < M + 24) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - M;
      texto(`Numa · Estado de ${d.mes} (continuación)`, M, y, { size: 9, color: GRIS });
      y -= 22;
    }
  };
  const titulo = (t: string) => {
    espacio(44);
    y -= 14;
    texto(t, M, y, { size: 13, font: negrita });
    y -= 8;
    raya(y, TINTA);
    y -= 16;
  };
  const subtitulo = (t: string, total?: string) => {
    espacio(34);
    y -= 4;
    texto(t, M, y, { size: 10.5, font: negrita });
    if (total) derecha(total, A4.w - M, y, { size: 10.5, font: negrita });
    y -= 15;
  };
  const fila = (dia: string, desc: string, monto: number, nota = '') => {
    espacio(16);
    texto(dia, M, y, { size: 9.5, color: GRIS });
    let descTxt = limpio(desc + (nota ? ` (${nota})` : ''));
    while (normal.widthOfTextAtSize(descTxt, 9.5) > 330 && descTxt.length > 4) descTxt = descTxt.slice(0, -2);
    texto(descTxt, M + 52, y, { size: 9.5 });
    derecha(`${monto > 0 ? '+' : ''}${S(monto)}`, A4.w - M, y, { size: 9.5, color: monto > 0 ? VERDE : TINTA });
    y -= 6;
    raya(y);
    y -= 11;
  };
  const dato = (etq: string, valor: string, x: number, ancho: number, destacar = false) => {
    page.drawRectangle({ x, y: y - 38, width: ancho, height: 48, color: SUAVE });
    texto(etq.toUpperCase(), x + 10, y - 2, { size: 7.5, font: negrita, color: GRIS });
    texto(valor, x + 10, y - 24, { size: destacar ? 15 : 13, font: negrita });
  };

  // ── Encabezado
  page.drawRectangle({ x: M, y: y - 26, width: 26, height: 26, color: TINTA });
  texto('N', M + 7.5, y - 19, { size: 15, font: negrita, color: rgb(1, 1, 1) });
  texto('Numa', M + 36, y - 13, { size: 16, font: negrita });
  texto('Finanzas con Mío', M + 36, y - 25, { size: 8.5, color: GRIS });
  derecha(`ESTADO DEL MES · ${d.mes.toUpperCase()} 2026`, A4.w - M, y - 11, { size: 9, font: negrita });
  derecha(`Movimientos del 1 al ${d.hoy} de ${d.mes}`, A4.w - M, y - 24, { size: 8.5, color: GRIS });
  y -= 46;
  raya(y, TINTA);
  y -= 22;
  texto(d.negocio ? `${d.negocioNombre} · ${d.nombre} ${d.apellido}` : `${d.nombre} ${d.apellido}`, M, y, { size: 12, font: negrita });
  derecha(d.negocio ? `Perfil emprendedor (RUC ${d.ruc})` : 'Perfil persona (DNI)', A4.w - M, y, { size: 9, color: GRIS });
  y -= 16;
  texto(d.cuenta, M, y, { size: 9, color: GRIS });
  y -= 26;

  // ── Resumen en números
  const ancho = (A4.w - 2 * M - 3 * 8) / 4;
  if (d.negocio) {
    const n = d.negocio;
    dato('Ventas', S(n.ventas), M, ancho);
    dato('Mercadería', S(n.mercaderia), M + (ancho + 8), ancho);
    dato('Otros gastos', S(n.otros), M + 2 * (ancho + 8), ancho);
    dato('Ganancia', S(n.resultado), M + 3 * (ancho + 8), ancho, true);
  } else {
    const p = d.personal;
    dato('Ingresos', S(p.ingresos), M, ancho);
    dato('Gastos', S(p.gastos), M + (ancho + 8), ancho);
    dato('Diferencia', S(p.neto), M + 2 * (ancho + 8), ancho, true);
    dato('Disponible hoy', S(d.disponible), M + 3 * (ancho + 8), ancho);
  }
  y -= 60;
  const fin = Math.round(d.proyeccion.saldo);
  const sem = d.proyeccion.semaforo;
  const frase =
    sem.nivel === 'verde' ? `Vas bien: el ${d.cierre} te quedarían unos S/ ${fin}.`
    : sem.nivel === 'amarillo' ? `Llegas justo: el ${d.cierre} te quedarían unos S/ ${fin}.`
    : `No llegas: el ${d.cierre} te faltarían unos S/ ${-fin}.`;
  texto(`Fin de mes · ${frase}`, M, y, { size: 10, font: negrita });
  if (d.negocio) derecha(`Margen sobre mercadería: ${d.negocio.margenBruto}%`, A4.w - M, y, { size: 9, color: GRIS });
  y -= 14;

  // ── Gastos por categoría
  const cats = d.negocio ? d.negocio.categorias : d.personal.categorias;
  titulo(d.negocio ? 'Gastos del negocio por categoría' : 'Gastos por categoría');
  const maxCat = Math.max(1, ...cats.map((c) => c.monto));
  for (const c of cats) {
    espacio(18);
    texto(c.nombre, M, y, { size: 10 });
    page.drawRectangle({ x: M + 130, y: y - 1, width: 260, height: 8, color: SUAVE });
    page.drawRectangle({ x: M + 130, y: y - 1, width: Math.max(3, (c.monto / maxCat) * 260), height: 8, color: TINTA });
    derecha(`${S(c.monto)}  ·  ${Math.round(c.pct)}%`, A4.w - M, y, { size: 10 });
    y -= 18;
  }

  // ── Detalle de movimientos
  const seccion = (det: NonNullable<DatosReporte['detalleNegocio']>, ingresos: string) => {
    subtitulo(ingresos, `+${S(det.totalIngresos)}`);
    if (!det.ingresos.length) fila('', 'Sin ingresos este mes', 0);
    for (const l of det.ingresos) fila(`${l.dia} nov`, l.descripcion, l.monto, l.dividido ? 'tu parte' : '');
    for (const g of det.grupos) {
      subtitulo(g.categoria, S(-g.total));
      for (const l of g.items) fila(`${l.dia} nov`, l.descripcion, l.monto, l.dividido ? 'tu parte' : '');
    }
    espacio(40);
    y -= 2;
    texto('Total de gastos', M, y, { size: 10.5, font: negrita });
    derecha(S(-det.totalGastos), A4.w - M, y, { size: 10.5, font: negrita });
    y -= 15;
    texto('Diferencia (ingresos - gastos)', M, y, { size: 10.5, font: negrita });
    derecha(S(r2(det.totalIngresos - det.totalGastos)), A4.w - M, y, { size: 10.5, font: negrita });
    y -= 12;
  };

  if (d.detalleNegocio) {
    titulo(`Movimientos de ${d.negocioNombre}`);
    seccion(d.detalleNegocio, 'Ventas y cobros');
    titulo('Movimientos personales');
    seccion(d.detallePersonal, 'Ingresos personales');
  } else {
    titulo('Todos tus movimientos');
    seccion(d.detallePersonal, 'Ingresos');
  }

  if (d.sinClasificar.length) {
    titulo(`Sin clasificar (${d.sinClasificar.length})`);
    espacio(16);
    texto('Aún no sabemos si son del negocio o personales; no están en las sumas de arriba.', M, y, { size: 9, color: NARANJA });
    y -= 16;
    for (const m of d.sinClasificar) fila(`${m.dia} nov`, m.descripcion, m.monto);
  }

  if (d.proximosCobros.length) {
    titulo('Cobros que vienen este mes');
    for (const c of d.proximosCobros) fila(`${c.dia} nov`, c.nombre, -c.monto);
  }

  // ── Ahorro y metas
  titulo('Ahorro y metas');
  for (const m of d.ahorro.metas) {
    espacio(16);
    texto(`Meta de ahorro «${m.nombre}»`, M, y, { size: 10 });
    derecha(`${S(m.ahorrado)} de ${S(m.objetivo)} (${m.pct}%)`, A4.w - M, y, { size: 10 });
    y -= 16;
  }
  for (const m of d.metas) {
    espacio(16);
    texto(`Tope de gasto en ${m.categoria}`, M, y, { size: 10 });
    derecha(`${S(m.gastado)} de ${S(m.limite)} (${m.pct}%)`, A4.w - M, y, { size: 10, color: m.pct >= 100 ? NARANJA : TINTA });
    y -= 16;
  }
  const ya = d.ofertas.filter((o) => o.desbloqueada).map((o) => o.titulo);
  if (ya.length) {
    espacio(16);
    texto(`Beneficios desbloqueados: ${ya.join(', ')}`, M, y, { size: 9.5, color: GRIS });
    y -= 16;
  }

  // ── Pie en todas las páginas
  const paginas = doc.getPages();
  paginas.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: M - 4 }, end: { x: A4.w - M, y: M - 4 }, thickness: 0.5, color: LINEA });
    p.drawText(limpio('Numa · concepto para el Hackathon BBVA AI Financial Life con datos ficticios · no es un documento oficial'), { x: M, y: M - 18, size: 7.5, font: normal, color: GRIS });
    const pg = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(pg, { x: A4.w - M - normal.widthOfTextAtSize(pg, 7.5), y: M - 18, size: 7.5, font: normal, color: GRIS });
  });

  return doc.save();
}
