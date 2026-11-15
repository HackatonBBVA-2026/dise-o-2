// Reporte de cierre del mes (correo), escrito para entenderse a la primera:
// frases simples, semáforo con palabras y consejos concretos. Los números salen del mismo
// motor que usa la app y Boot. Persona (DNI): sus finanzas. Empresa (RUC): su negocio primero.
import * as data from './data';
import * as f from './finanzas';
import { ESTADO_VACIO, clasificarTodos, pendientes, resumenNegocio, resumenPersonal } from './clasificacion';
import { verMetas } from './metas';
import { verMetasAhorro, verOfertas } from './ahorro';
import { alertasDe } from './alertas';
import { r2, soles } from './format';
import type { MovimientoClasificado } from './clasificacion';
import type { Perfil } from './sesion';

const MES = 'noviembre';

interface Linea { dia: number; descripcion: string; categoria: string; monto: number; dividido: boolean }

/** Movimientos de un lado (personal o negocio), con la parte que le toca si está dividido. */
function detalle(movs: MovimientoClasificado[], lado: 'personal' | 'negocio') {
  const lineas: Linea[] = movs
    .filter((m) => m.efectivo !== null)
    .map((m) => ({
      dia: m.dia,
      descripcion: m.descripcion,
      categoria: m.categoria,
      monto: r2(lado === 'negocio' ? (m.monto * m.pct) / 100 : m.monto * (1 - m.pct / 100)),
      dividido: m.efectivo === 'dividido',
    }))
    .filter((l) => Math.abs(l.monto) > 0.004)
    .sort((a, b) => a.dia - b.dia);
  const ingresos = lineas.filter((l) => l.monto > 0);
  const porCategoria = new Map<string, Linea[]>();
  for (const l of lineas.filter((x) => x.monto < 0)) porCategoria.set(l.categoria, [...(porCategoria.get(l.categoria) ?? []), l]);
  const grupos = [...porCategoria.entries()]
    .map(([categoria, items]) => ({ categoria, items, total: r2(items.reduce((a, x) => a - x.monto, 0)) }))
    .sort((a, b) => b.total - a.total);
  return {
    ingresos,
    totalIngresos: r2(ingresos.reduce((a, x) => a + x.monto, 0)),
    grupos,
    totalGastos: r2(grupos.reduce((a, g) => a + g.total, 0)),
    cantidad: lineas.length,
  };
}

export function datosReporte(perfil: Perfil) {
  const movs = clasificarTodos(ESTADO_VACIO);
  const personal = resumenPersonal(movs);
  const proy = f.proyeccionFinDeMes();
  return {
    perfil,
    mes: MES,
    hoy: data.hoy,
    cierre: data.cierreMes,
    nombre: data.usuario.nombre,
    negocioNombre: data.negocio.nombre,
    disponible: f.disponible(),
    proyeccion: { saldo: proy.saldo, semaforo: f.semaforo(proy.saldo) },
    personal: { ingresos: personal.ingresos, gastos: personal.gastos, neto: personal.neto, categorias: personal.categorias.slice(0, 5) },
    negocio: perfil === 'empresa' ? resumenNegocio(movs) : null,
    porClasificar: perfil === 'empresa' ? pendientes(movs).length : 0,
    metas: verMetas(perfil),
    ahorro: verMetasAhorro(perfil),
    ofertas: verOfertas(perfil).ofertas,
    avisos: alertasDe(perfil).map((a) => ({ titulo: a.titulo, texto: a.texto })),
    // Detalle completo, movimiento por movimiento
    detallePersonal: detalle(movs, 'personal'),
    detalleNegocio: perfil === 'empresa' ? detalle(movs, 'negocio') : null,
    sinClasificar: perfil === 'empresa' ? pendientes(movs).map((m) => ({ dia: m.dia, descripcion: m.descripcion, monto: m.monto })) : [],
    proximosCobros: data.proximosCobros.filter((c) => c.dia > data.hoy),
  };
}

export type DatosReporte = ReturnType<typeof datosReporte>;

const esc = (t: unknown) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const S = (n: number) => soles(Math.round(n), 0); // en el correo, montos redondos: más fáciles de leer
const meses = (n: number) => `${n} ${n === 1 ? 'mes' : 'meses'}`;

export function asuntoReporte(d: DatosReporte) {
  if (d.negocio) return `${d.negocioNombre}: así te fue en ${d.mes}`;
  return `${d.nombre}, así va tu ${d.mes} 👋`;
}

/** Frases que resumen el mes, en lenguaje de todos los días. */
function resumen(d: DatosReporte) {
  const sem = d.proyeccion.semaforo;
  const fin = Math.round(d.proyeccion.saldo);
  const finDeMes =
    sem.nivel === 'verde' ? `🟢 <b>Vas bien.</b> Contando los cobros y gastos que aún faltan, el ${d.cierre} te quedarían unos ${S(fin)}.`
    : sem.nivel === 'amarillo' ? `🟡 <b>Llegas justo.</b> Contando los cobros y gastos que aún faltan, el ${d.cierre} te quedarían unos ${S(fin)}. Cuida los gastos chicos.`
    : `🔴 <b>Ojo, no llegas.</b> Contando los cobros y gastos que aún faltan, el ${d.cierre} te faltarían unos ${S(-fin)}. Pregúntale a Boot antes de gastar.`;
  if (d.negocio) {
    const n = d.negocio;
    const gano = n.resultado >= 0
      ? `Hasta hoy tu negocio vendió <b>${S(n.ventas)}</b> y, después de pagar mercadería y otros gastos, te quedan <b>${S(n.resultado)}</b> de ganancia.`
      : `Hasta hoy tu negocio vendió <b>${S(n.ventas)}</b>, pero gastó más de lo que vendió: <b>${S(n.resultado)}</b>.`;
    return [gano, `De cada S/ 100 que vendes, te quedan S/ ${n.margenBruto} después de pagar la mercadería.`, finDeMes];
  }
  const p = d.personal;
  return [
    p.neto >= 0
      ? `Hasta hoy te entraron <b>${S(p.ingresos)}</b> y gastaste <b>${S(p.gastos)}</b>: vas <b>${S(p.neto)}</b> a favor.`
      : `Hasta hoy gastaste <b>${S(p.gastos)}</b>, más de lo que te entró (${S(p.ingresos)}).`,
    finDeMes,
  ];
}

/** Consejos concretos a partir de los datos (sin recomendaciones externas). */
function consejos(d: DatosReporte) {
  const c: string[] = [];
  for (const m of d.metas) {
    if (m.nivel === 'superada') c.push(`Te pasaste de tu tope de <b>${esc(m.categoria)}</b>: llevas ${S(m.gastado)} de ${S(m.limite)}.`);
    else if (m.nivel === 'cerca') c.push(`Estás cerca de tu tope de <b>${esc(m.categoria)}</b>: te quedan ${S(m.disponible)} para el resto del mes.`);
    else if (m.nivel === 'en riesgo') c.push(`Si sigues así, en <b>${esc(m.categoria)}</b> llegarías a ${S(m.proyectadoFinDeMes)} y pasarías tu tope de ${S(m.limite)}.`);
  }
  // Fin de mes ya va en el resumen; metas y ofertas, en sus secciones. Lo demás (p. ej. duplicados) va aquí con su título.
  for (const a of d.avisos) {
    if (/fin de mes|meta|Estás cerca de:/i.test(a.titulo)) continue;
    c.push(`<b>${esc(a.titulo)}</b> ${esc(a.texto)}`);
  }
  if (d.porClasificar) c.push(`Tienes <b>${d.porClasificar} movimientos</b> que no sabemos si son del negocio o tuyos. Clasifícalos en Avisos para que tus números sean exactos.`);
  return c;
}

export function htmlReporte(d: DatosReporte) {
  const titulo = (t: string) => `<p style="margin:0 0 10px;font-size:18px;font-weight:700;color:#14161B;">${t}</p>`;
  const parrafo = (t: string) => `<p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:#2B2F38;">${t}</p>`;
  const bloque = (contenido: string) => `<tr><td style="padding:20px 24px;border-top:1px solid #ECE9E1;">${contenido}</td></tr>`;
  const barra = (nombre: string, monto: number, pct: number) =>
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;">
<tr><td style="font-size:15px;color:#2B2F38;padding-bottom:4px;">${esc(nombre)}</td><td style="font-size:15px;color:#14161B;text-align:right;padding-bottom:4px;"><b>${S(monto)}</b></td></tr>
<tr><td colspan="2"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECE9E1;border-radius:6px;"><tr><td style="width:${Math.max(3, Math.min(100, Math.round(pct)))}%;background:#1F56D1;height:10px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr></table>`;

  const partes: string[] = [];

  // 1. Resumen en palabras
  partes.push(bloque(resumen(d).map(parrafo).join('')));

  // 2. En qué se fue la plata
  if (d.negocio) {
    partes.push(bloque(titulo('¿En qué gastó tu negocio?') + d.negocio.categorias.slice(0, 4).map((c) => barra(c.nombre, c.monto, c.pct)).join('')));
  } else {
    partes.push(bloque(titulo('¿En qué se fue tu plata?') + d.personal.categorias.slice(0, 4).map((c) => barra(c.nombre, c.monto, c.pct)).join('') +
      `<p style="margin:4px 0 0;font-size:14px;color:#6B7280;">Lo que más pesó fue ${esc(d.personal.categorias[0]?.nombre?.toLowerCase() ?? '')}.</p>`));
  }

  // 3. Ahorro y ofertas
  const ahorroTxt = d.ahorro.metas.map((m) =>
    m.cumplida
      ? `🎉 ¡Cumpliste tu meta <b>${esc(m.nombre)}</b>!`
      : `Llevas <b>${S(m.ahorrado)}</b> para <b>${esc(m.nombre)}</b> (${m.pct}%). Si separas ${S(d.ahorro.ahorroSugeridoMensual)} al mes, llegas en unos ${meses(m.mesesEstimados)}.`
  );
  const sig = d.ofertas.find((o) => !o.desbloqueada);
  const ya = d.ofertas.filter((o) => o.desbloqueada);
  if (ya.length) ahorroTxt.push(`🎁 Ya tienes: ${esc(ya.map((o) => o.titulo).join(', '))}.`);
  if (sig) ahorroTxt.push(`🎁 Te faltan <b>${S(sig.falta)}</b> de ahorro para desbloquear: ${esc(sig.titulo)} (${esc(sig.beneficio.toLowerCase())}).`);
  partes.push(bloque(titulo('Tu ahorro') + ahorroTxt.map(parrafo).join('')));

  // 4. Qué revisar
  const tips = consejos(d);
  if (tips.length) {
    partes.push(bloque(titulo('Esto vale la pena revisar') +
      `<ul style="margin:0;padding-left:20px;">${tips.map((t) => `<li style="margin:0 0 8px;font-size:16px;line-height:1.5;color:#2B2F38;">${t}</li>`).join('')}</ul>`));
  }

  // 5. Detalle completo: cada ingreso y cada gasto, agrupados por categoría
  const S2 = (n: number) => soles(n); // en el detalle, con céntimos (igual que en tu cuenta)
  const celda = 'padding:7px 0;font-size:14px;border-bottom:1px solid #F0EDE5;';
  const filaMov = (l: { dia: number; descripcion: string; monto: number; dividido?: boolean }) =>
    `<tr><td style="${celda}color:#6B7280;width:56px;">${l.dia} nov</td><td style="${celda}color:#2B2F38;">${esc(l.descripcion)}${l.dividido ? ' <span style="color:#6B7280;">(tu parte)</span>' : ''}</td><td style="${celda}text-align:right;white-space:nowrap;color:${l.monto > 0 ? '#15803D' : '#14161B'};">${l.monto > 0 ? '+' : ''}${S2(l.monto)}</td></tr>`;
  const filaTotal = (t: string, monto: string) =>
    `<tr><td colspan="2" style="padding:9px 0;font-size:15px;font-weight:700;color:#14161B;">${esc(t)}</td><td style="padding:9px 0;font-size:15px;font-weight:700;text-align:right;white-space:nowrap;color:#14161B;">${monto}</td></tr>`;
  const tablaMovs = (filas: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>`;
  const subtitulo = (t: string) => `<p style="margin:16px 0 6px;font-size:15px;font-weight:700;color:#1F56D1;">${t}</p>`;
  const seccionDetalle = (det: ReturnType<typeof detalle>, ingresosTitulo: string) =>
    subtitulo(`${ingresosTitulo} · ${S2(det.totalIngresos)}`) +
    (det.ingresos.length ? tablaMovs(det.ingresos.map(filaMov).join('')) : parrafo('No hubo ingresos.')) +
    det.grupos.map((g) =>
      subtitulo(`${esc(g.categoria)} · ${S2(-g.total)}`) + tablaMovs(g.items.map(filaMov).join(''))
    ).join('') +
    tablaMovs(filaTotal('Total de gastos', S2(-det.totalGastos)) + filaTotal('Diferencia (ingresos − gastos)', S2(r2(det.totalIngresos - det.totalGastos))));

  let detalleHtml = titulo('Detalle completo del mes') +
    `<p style="margin:0 0 6px;font-size:14px;color:#6B7280;">Todos tus movimientos del 1 al ${d.hoy} de ${esc(d.mes)}, agrupados para que los revises fácil.</p>`;
  if (d.detalleNegocio) {
    detalleHtml += `<p style="margin:14px 0 0;font-size:17px;font-weight:700;color:#14161B;">🏪 ${esc(d.negocioNombre)}</p>` + seccionDetalle(d.detalleNegocio, 'Ventas y cobros');
    detalleHtml += `<p style="margin:22px 0 0;font-size:17px;font-weight:700;color:#14161B;">🏠 Tus gastos personales</p>`;
  }
  detalleHtml += seccionDetalle(d.detallePersonal, d.detalleNegocio ? 'Ingresos personales' : 'Tus ingresos');
  if (d.sinClasificar.length) {
    detalleHtml += subtitulo(`Sin clasificar (${d.sinClasificar.length})`) +
      `<p style="margin:0 0 4px;font-size:14px;color:#C2410C;">Aún no sabemos si son del negocio o tuyos, por eso no están en las sumas de arriba.</p>` +
      tablaMovs(d.sinClasificar.map(filaMov).join(''));
  }
  if (d.proximosCobros.length) {
    detalleHtml += subtitulo('Cobros que vienen este mes') +
      tablaMovs(d.proximosCobros.map((c) => filaMov({ dia: c.dia, descripcion: c.nombre, monto: -c.monto })).join(''));
  }
  partes.push(bloque(detalleHtml));

  // 6. Cierre
  partes.push(bloque(parrafo('¿Dudas? Abre Mío y pregúntale a Boot, por ejemplo: <i>«¿Llego a fin de mes?»</i> o <i>«¿Puedo gastar S/ 200?»</i>.')));

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(asuntoReporte(d))}</title></head>
<body style="margin:0;padding:24px 12px;background:#F6F5F1;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FCFBF8;border:1px solid #ECE9E1;border-radius:16px;">
<tr><td style="padding:24px 24px 8px;">
<p style="margin:0;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#1F56D1;font-weight:700;">Mío · tu resumen del mes</p>
<h1 style="margin:8px 0 6px;font-size:26px;line-height:1.25;color:#14161B;">Hola, ${esc(d.nombre)} 👋</h1>
<p style="margin:0 0 8px;font-size:15px;color:#6B7280;">${d.negocio ? `Así le fue a ${esc(d.negocioNombre)} en ${esc(d.mes)}` : `Así va tu ${esc(d.mes)}`} (datos al día ${d.hoy}). Hoy tienes ${S(d.disponible)} disponibles.</p>
</td></tr>
${partes.join('\n')}
<tr><td style="padding:16px 24px;border-top:1px solid #ECE9E1;font-size:12px;line-height:1.5;color:#6B7280;">Concepto para el Hackathon BBVA AI Financial Life con datos ficticios. Son simulaciones con tus movimientos, no asesoría financiera. Puedes dejar de recibir este correo en Perfil › Reportes.</td></tr>
</table></body></html>`;
}

/** Versión en texto plano, con las mismas frases (algunos correos la muestran en vez del HTML). */
export function textoReporte(d: DatosReporte) {
  const limpio = (t: string) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
  const l = [`Hola, ${d.nombre}.`, '', ...resumen(d).map(limpio), ''];
  l.push(...d.ahorro.metas.map((m) => `Ahorro ${m.nombre}: ${S(m.ahorrado)} de ${S(m.objetivo)} (${m.pct}%).`));
  const tips = consejos(d).map(limpio);
  if (tips.length) l.push('', 'Esto vale la pena revisar:', ...tips.map((t) => `- ${t}`));
  const lineasDetalle = (det: ReturnType<typeof detalle>, titulo: string) => [
    '', `${titulo}: ${soles(det.totalIngresos)}`, ...det.ingresos.map((x) => `  ${x.dia} nov  ${x.descripcion}  +${soles(x.monto)}`),
    ...det.grupos.flatMap((g) => [`${g.categoria}: ${soles(-g.total)}`, ...g.items.map((x) => `  ${x.dia} nov  ${x.descripcion}  ${soles(x.monto)}`)]),
    `Total de gastos: ${soles(-det.totalGastos)}`,
  ];
  l.push('', 'DETALLE COMPLETO DEL MES');
  if (d.detalleNegocio) l.push(...lineasDetalle(d.detalleNegocio, `${d.negocioNombre} · ventas y cobros`), '', 'TUS GASTOS PERSONALES');
  l.push(...lineasDetalle(d.detallePersonal, d.detalleNegocio ? 'Ingresos personales' : 'Tus ingresos'));
  if (d.sinClasificar.length) l.push('', 'Sin clasificar:', ...d.sinClasificar.map((x) => `  ${x.dia} nov  ${x.descripcion}  ${soles(x.monto)}`));
  if (d.proximosCobros.length) l.push('', 'Cobros que vienen:', ...d.proximosCobros.map((c) => `  ${c.dia} nov  ${c.nombre}  ${soles(-c.monto)}`));
  l.push('', '¿Dudas? Pregúntale a Boot en la app.', 'Datos ficticios · simulación, no asesoría.');
  return l.join('\n');
}
