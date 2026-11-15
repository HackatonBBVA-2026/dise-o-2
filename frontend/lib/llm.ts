// Boot con IA: Groq (API compatible con OpenAI) usando function calling.
// El LLM entiende la pregunta y elige una herramienta; los números SIEMPRE salen del código
// (finanzas, clasificación, metas, ahorro). El LLM solo redacta, y solo con datos de la app.
// Las herramientas cambian según el perfil: persona (DNI) o emprendedor/empresa (RUC).
import * as data from './data';
import * as f from './finanzas';
import { ESTADO_VACIO, clasificarTodos, enVista, pendientes, resumenNegocio, resumenPersonal } from './clasificacion';
import * as metas from './metas';
import * as ahorro from './ahorro';
import { verProductos, type Producto } from './productos';
import { r2, soles as S } from './format';
import { memoria } from './memoria';
import type { Perfil } from './sesion';
import type { RespuestaBoot, Tono } from './types';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const MODELO = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
// Si el modelo principal llega al límite gratuito (error 429), se usa este.
const MODELO_RESPALDO = process.env.GROQ_MODEL_RESPALDO || 'openai/gpt-oss-20b';
const TIMEOUT_MS = Number(process.env.GROQ_TIMEOUT_MS || 12000);
const MAX_PASOS = 4; // vueltas máximas LLM → herramienta → LLM
const MAX_HISTORIAL = 8;

export const iaActiva = () => Boolean(process.env.GROQ_API_KEY);

type Args = Record<string, unknown>;
type Resultado = Record<string, unknown>;
type Fila = NonNullable<RespuestaBoot['tabla']>[number];

interface Herramienta {
  name: string;
  description: string;
  parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  perfiles: Perfil[];
  run: (perfil: Perfil, args: Args) => Resultado;
  tabla?: (r: any) => Fila[] | null;
}

const movs = () => clasificarTodos(ESTADO_VACIO);
const tonoRiesgo = (r: string): Tono => (r === 'Alto' ? 'rojo' : r === 'Medio' ? 'amarillo' : 'verde');
const sinParams = { type: 'object' as const, properties: {} };

const tablaMetasGasto = (lista: metas.EstadoMetaGasto[]): Fila[] =>
  lista.map((m) => ({
    label: `${m.categoria} · ${m.pct}% de ${S(m.limite)}`,
    valor: S(m.gastado),
    tono: m.nivel === 'superada' ? 'rojo' : m.nivel === 'ok' ? 'verde' : 'amarillo',
  }));

const tablaMetasAhorro = (lista: ReturnType<typeof ahorro.verMetasAhorro>['metas']): Fila[] =>
  lista.map((m) => ({ label: `${m.nombre} · ${m.pct}% de ${S(m.objetivo)}`, valor: S(m.ahorrado), tono: m.cumplida ? 'verde' : '' }));

const AMBOS: Perfil[] = ['persona', 'empresa'];

const HERRAMIENTAS: Herramienta[] = [
  {
    name: 'ver_resumen_mes',
    description: 'Resumen del mes: ingresos, gastos, lo que sobra y gasto por categoría (personal para persona; del negocio para emprendedor).',
    parameters: sinParams,
    perfiles: AMBOS,
    run: (perfil) => {
      if (perfil === 'empresa') {
        const n = resumenNegocio(movs());
        return { disponibleEnCuenta: f.disponible(), negocio: n };
      }
      const p = resumenPersonal(movs());
      return { disponible: f.disponible(), ingresos: p.ingresos, gastos: p.gastos, neto: p.neto, categorias: p.categorias };
    },
  },
  {
    name: 'proyectar_fin_de_mes',
    description: 'Cuánto le quedaría en la cuenta el último día del mes y si llega (semáforo).',
    parameters: sinParams,
    perfiles: AMBOS,
    run: () => {
      const p = f.proyeccionFinDeMes();
      return { ...p, disponibleHoy: f.disponible(), semaforo: f.semaforo(p.saldo), diaCierre: data.cierreMes };
    },
    tabla: (r) => [
      { label: 'Disponible hoy', valor: S(r.disponibleHoy) },
      { label: 'Cobros fijos que vienen', valor: S(-r.pendientes) },
      { label: `Gasto diario estimado × ${r.diasRestantes} días`, valor: S(-r.variable) },
      { label: `Te quedaría el ${r.diaCierre}`, valor: S(r.saldo), tono: r.semaforo.nivel },
    ],
  },
  {
    name: 'simular_compra',
    description: 'Simula un gasto antes de hacerlo: saldo a fin de mes con y sin la compra y riesgo de quedar en rojo.',
    parameters: { type: 'object', properties: { monto: { type: 'number', description: 'Monto en soles' }, descripcion: { type: 'string' } }, required: ['monto'] },
    perfiles: AMBOS,
    run: (_p, a) => {
      const monto = Number(a.monto);
      if (!(monto > 0)) return { error: 'Monto inválido' };
      return { monto, descripcion: a.descripcion ?? null, ...f.simularCompra(monto), diaCierre: data.cierreMes };
    },
    tabla: (r) => [
      { label: `Al ${r.diaCierre}, sin la compra`, valor: S(r.sin) },
      { label: `Al ${r.diaCierre}, con la compra`, valor: S(r.con), tono: r.con < 0 ? 'rojo' : '' },
      { label: 'Riesgo de quedar en rojo', valor: r.riesgo, tono: tonoRiesgo(r.riesgo) },
    ],
  },
  {
    name: 'ver_movimientos',
    description: 'Movimientos del mes, filtrables por categoría o tipo (ingreso/gasto).',
    parameters: {
      type: 'object',
      properties: { categoria: { type: 'string' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, limite: { type: 'integer', description: 'Por defecto 10' } },
    },
    perfiles: AMBOS,
    run: (perfil, a) => {
      let lista = movs().filter((m) => enVista(m, perfil === 'empresa' ? 'negocio' : 'personal'));
      if (a.categoria) lista = lista.filter((m) => m.categoria.toLowerCase() === String(a.categoria).toLowerCase());
      if (a.tipo === 'ingreso') lista = lista.filter((m) => m.monto > 0);
      if (a.tipo === 'gasto') lista = lista.filter((m) => m.monto < 0);
      const limite = Math.min(Math.max(Number(a.limite) || 10, 1), 30);
      return { total: lista.length, movimientos: lista.slice(0, limite).map(({ dia, descripcion, categoria, monto, efectivo }) => ({ dia, descripcion, categoria, monto, ambito: efectivo })) };
    },
  },
  {
    name: 'ver_proximos_cobros',
    description: 'Cobros y pagos fijos que vienen este mes con su día y monto.',
    parameters: sinParams,
    perfiles: AMBOS,
    run: () => ({ hoy: data.hoy, cobros: data.proximosCobros.filter((c) => c.dia > data.hoy) }),
    tabla: (r) => r.cobros.map((c: { nombre: string; dia: number; monto: number }) => ({ label: `${c.nombre} · día ${c.dia}`, valor: S(-c.monto) })),
  },
  {
    name: 'ver_suscripciones',
    description: 'Suscripciones personales activas y su costo mensual total.',
    parameters: sinParams,
    perfiles: ['persona'],
    run: () => ({ suscripciones: data.suscripciones, totalMensual: r2(data.suscripciones.reduce((a, s) => a + s.monto, 0)) }),
    tabla: (r) => r.suscripciones.map((s: { nombre: string; monto: number }) => ({ label: s.nombre, valor: S(s.monto) })),
  },
  {
    name: 'ver_cobros_duplicados',
    description: 'Detecta cobros duplicados del mes (mismo comercio y monto).',
    parameters: sinParams,
    perfiles: AMBOS,
    run: () => ({ duplicados: f.detectarDuplicados() }),
  },
  {
    name: 'ver_cuentas_y_tarjetas',
    description: 'Cuentas y tarjetas del usuario en la app, con sus saldos.',
    parameters: sinParams,
    perfiles: AMBOS,
    // Minimización de datos: al LLM no van el titular, el documento ni números completos.
    run: (perfil) => ({
      cuentas: data.cuentas.map((c) => ({ tipo: c.tipo, ultimos4: c.numero, saldo: c.saldo })),
      tarjetas: [{ tipo: data.tarjeta.tipo, ultimos4: data.tarjeta.ultimos, vence: data.tarjeta.vence }],
      ...(perfil === 'empresa' ? { negocio: { nombre: data.negocio.nombre, rubro: data.negocio.rubro, regimen: data.negocio.regimen } } : {}),
    }),
  },
  {
    name: 'simular_prestamo',
    description: 'Simula la cuota de un préstamo FICTICIO según lo que sobra en promedio en 6 meses. No es una oferta.',
    parameters: { type: 'object', properties: { monto: { type: 'number' }, meses: { type: 'integer', description: 'Por defecto 12' } }, required: ['monto'] },
    perfiles: AMBOS,
    run: (_p, a) => {
      const monto = Number(a.monto);
      if (!(monto > 0)) return { error: 'Monto inválido' };
      return { ...f.simularPrestamo(monto, Number(a.meses) || 12), aviso: 'Producto ficticio. Simulación, no oferta.' };
    },
    tabla: (r) => [
      { label: 'Préstamo ejemplo (ficticio)', valor: S(r.monto) },
      { label: `Cuota estimada · ${r.meses} meses`, valor: S(r.cuota) },
      { label: 'Usaría de tu margen', valor: `${r.usoMargen}%`, tono: r.usoMargen >= 80 ? 'rojo' : 'verde' },
    ],
  },
  {
    name: 'ver_productos_y_beneficios',
    description:
      'Préstamos, tarjetas de crédito y beneficios de Numa que el usuario tiene preaprobados o disponibles, con montos calculados con sus datos. Úsala cuando pregunte qué beneficios, préstamos, tarjetas o productos tiene o puede pedir.',
    parameters: sinParams, // siempre la lista completa (un filtro opcional hacía que el modelo mandara null)
    perfiles: AMBOS,
    run: (perfil) => verProductos(perfil),
    tabla: (r) =>
      r.productos.map((p: Producto) => ({
        label: p.nombre,
        valor: p.estado === 'no por ahora' ? 'Aún no' : p.monto ? `${p.estado === 'preaprobado' ? 'Preaprobado' : 'Disponible'} · ${S(p.monto)}` : 'Desbloqueado',
        tono: p.estado === 'no por ahora' ? '' : 'verde',
      })),
  },
  // ---- Solo emprendedor / empresa ----
  {
    name: 'ver_negocio',
    description: 'Resultado del negocio en el mes: ventas, mercadería, otros gastos, resultado, margen y cada cuánto repone stock.',
    parameters: sinParams,
    perfiles: ['empresa'],
    run: () => ({ negocio: data.negocio, ...resumenNegocio(movs()), movimientosSinClasificar: pendientes(movs()).length }),
    tabla: (r) => [
      { label: 'Ventas', valor: S(r.ventas), tono: 'verde' },
      { label: 'Mercadería', valor: S(-r.mercaderia) },
      { label: 'Otros gastos', valor: S(-r.otros) },
      { label: 'Resultado', valor: S(r.resultado), tono: r.estado.nivel },
      { label: 'Margen bruto', valor: `${r.margenBruto}%` },
    ],
  },
  {
    name: 'simular_reposicion',
    description: 'Simula si la ganancia del negocio alcanza para reponer mercadería por un monto.',
    parameters: { type: 'object', properties: { monto: { type: 'number', description: 'Monto de la compra de mercadería' } } },
    perfiles: ['empresa'],
    run: (_p, a) => {
      const n = resumenNegocio(movs());
      const monto = Number(a.monto) > 0 ? Number(a.monto) : n.reposicion?.montoPromedio ?? 500;
      const gananciaDia = r2(n.resultado / data.hoy);
      const falta = r2(Math.max(0, monto - n.resultado));
      return { monto, resultadoNegocio: n.resultado, alcanza: falta === 0, falta, gananciaPorDia: gananciaDia, diasParaCubrir: falta && gananciaDia > 0 ? Math.ceil(falta / gananciaDia) : 0, reposicion: n.reposicion };
    },
    tabla: (r) => [
      { label: 'Reposición', valor: S(r.monto) },
      { label: 'Resultado del negocio en el mes', valor: S(r.resultadoNegocio) },
      r.alcanza
        ? { label: 'Alcanza con la ganancia', valor: 'Sí', tono: 'verde' }
        : { label: 'Faltan', valor: `${S(r.falta)} (~${r.diasParaCubrir} días)`, tono: 'amarillo' },
    ],
  },
  {
    name: 'ver_por_clasificar',
    description: 'Movimientos que aún no se sabe si son del negocio o personales.',
    parameters: sinParams,
    perfiles: ['empresa'],
    run: () => ({ pendientes: pendientes(movs()).map(({ dia, descripcion, monto, ambito, confianza }) => ({ dia, descripcion, monto, sugerencia: ambito, confianza })) }),
  },
  // ---- Metas, ahorro y ofertas (cada perfil con las suyas) ----
  {
    name: 'definir_meta_gasto',
    description: 'Crea o actualiza un límite de gasto mensual para una categoría. Mío avisa al 80% y al superarlo.',
    parameters: { type: 'object', properties: { categoria: { type: 'string' }, limite: { type: 'number' } }, required: ['categoria', 'limite'] },
    perfiles: AMBOS,
    run: (perfil, a) => metas.definirMeta(perfil, a.categoria, a.limite),
    tabla: (r) => (r.ok ? tablaMetasGasto([r.meta]) : null),
  },
  {
    name: 'ver_metas',
    description: 'Metas de gasto y cuánto lleva de cada una.',
    parameters: sinParams,
    perfiles: AMBOS,
    run: (perfil) => {
      const lista = metas.verMetas(perfil);
      return lista.length ? { metas: lista } : { metas: [], nota: 'Aún no tiene metas de gasto.', categoriasDisponibles: metas.categoriasDe(perfil).map((c) => c.nombre) };
    },
    tabla: (r) => (r.metas.length ? tablaMetasGasto(r.metas) : null),
  },
  {
    name: 'ver_metas_ahorro',
    description: 'Metas de ahorro: cuánto lleva, cuánto falta y en cuántos meses llegaría.',
    parameters: sinParams,
    perfiles: AMBOS,
    run: (perfil) => ahorro.verMetasAhorro(perfil),
    tabla: (r) => tablaMetasAhorro(r.metas),
  },
  {
    name: 'crear_meta_ahorro',
    description: 'Crea o actualiza una meta de ahorro con un monto objetivo.',
    parameters: { type: 'object', properties: { nombre: { type: 'string' }, objetivo: { type: 'number' } }, required: ['nombre', 'objetivo'] },
    perfiles: AMBOS,
    run: (perfil, a) => ahorro.crearMetaAhorro(perfil, a.nombre, a.objetivo),
    tabla: (r) => (r.ok ? tablaMetasAhorro([r.meta]) : null),
  },
  {
    name: 'separar_ahorro',
    description: 'Separa dinero del saldo hacia una meta de ahorro (simulación). Úsala solo si el usuario lo pide con un monto claro.',
    parameters: { type: 'object', properties: { nombre: { type: 'string' }, monto: { type: 'number' } }, required: ['nombre', 'monto'] },
    perfiles: AMBOS,
    run: (perfil, a) => ahorro.separarAhorro(perfil, a.nombre, a.monto),
    tabla: (r) => (r.ok ? tablaMetasAhorro([r.meta]) : null),
  },
  {
    name: 'ver_ofertas',
    description: 'Ofertas y paquetes que se desbloquean al ahorrar: cuáles tiene y cuánto le falta para las demás.',
    parameters: sinParams,
    perfiles: AMBOS,
    run: (perfil) => ahorro.verOfertas(perfil),
    tabla: (r) => r.ofertas.map((o: { titulo: string; desbloqueada: boolean; falta: number }) => ({
      label: o.titulo, valor: o.desbloqueada ? 'Desbloqueada' : `Faltan ${S(o.falta)}`, tono: o.desbloqueada ? 'verde' : '',
    })),
  },
];

const herramientasDe = (perfil: Perfil) => HERRAMIENTAS.filter((h) => h.perfiles.includes(perfil));

function instrucciones(perfil: Perfil) {
  const quien =
    perfil === 'empresa'
      ? `Hablas con ${data.usuario.nombre}, dueña del negocio ${data.negocio.nombre} (${data.negocio.rubro}, régimen ${data.negocio.regimen}). Entró con su RUC: prioriza las finanzas del negocio.`
      : `Hablas con ${data.usuario.nombre}. Entró con su DNI: habla solo de sus finanzas personales. Si pregunta por un negocio, ventas o RUC, dile que con DNI ve sus finanzas personales y que para su negocio debe ingresar con su RUC; no uses sus datos personales como si fueran de un negocio.`;
  return [
    'Eres Mío, el asistente con IA de la app Numa.',
    quien,
    `Hoy es el día ${data.hoy} del mes y el mes cierra el día ${data.cierreMes}. Moneda: soles (S/).`,
    'Reglas:',
    '- NUNCA calcules ni inventes cifras. Para cualquier dato usa las herramientas y cita solo lo que devuelven.',
    '- Menciona solo los 1 o 2 números clave y explica qué significan. No hables de tablas, herramientas ni de cómo obtuviste los datos.',
    '- Responde en español de Perú, cercano y claro, en máximo 3 oraciones cortas. Sin markdown ni listas.',
    '- Escribe los montos como en Perú: S/ 1,400 o S/ 95.79 (coma para miles, punto para decimales).',
    '- No menciones comisiones, seguros, cargos ni condiciones que las herramientas no devuelvan.',
    '- SOLO respondes sobre los datos del usuario en esta app (cuentas, tarjetas, ingresos, movimientos, gastos, metas, ahorro, ofertas, productos de Numa y simulaciones con esos datos).',
    '- Si pregunta por beneficios, préstamos, tarjetas o productos que tiene o puede pedir, usa ver_productos_y_beneficios: menciona los preaprobados con su monto, por qué califica (con sus datos) y aclara que son productos ficticios sujetos a evaluación. Si menciona un monto concreto de préstamo (por ejemplo «¿y si pido S/ 1,000?»), usa SIEMPRE simular_prestamo con ese monto y di la cuota exacta que devuelve y si entra en lo preaprobado.',
    '- No das información externa ni conocimiento general (noticias, definiciones, trámites, otros bancos o productos del mercado). Si no se responde con las herramientas, di en una oración que solo puedes ayudar con sus cuentas de Numa y sugiere algo que sí puedes hacer.',
    '- Las ofertas y productos son solo los de ver_ofertas y ver_productos_y_beneficios; no inventes otros ni otras tasas. Separa ahorro solo si el usuario lo pide con un monto.',
    '- Son simulaciones con sus datos, no asesoría financiera; la decisión es del usuario. Los préstamos y tarjetas son productos ficticios de la demo.',
  ].join('\n');
}

// Historial corto por perfil (demo de un solo usuario).
const historial = memoria<Record<Perfil, { role: 'user' | 'assistant'; content: string }[]>>('historialBoot', () => ({ persona: [], empresa: [] }));

type MensajeLLM = Record<string, unknown>;

async function llamarGroq(mensajes: MensajeLLM[], modelo: string, perfil: Perfil) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: modelo,
        messages: mensajes,
        tools: herramientasDe(perfil).map(({ name, description, parameters }) => ({ type: 'function', function: { name, description, parameters } })),
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 400,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const err = new Error(`Groq respondió ${res.status}: ${(await res.text()).slice(0, 200)}`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    const json = await res.json();
    return json.choices[0].message as { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments?: string } }[] };
  } finally {
    clearTimeout(timer);
  }
}

// A veces el modelo pega dos versiones de su respuesta: idénticas ("X.X.") o reformuladas sin
// espacio entre ellas ("…S/500.No, con…"). Se deja solo la primera.
function sinRepetir(texto: string) {
  const t = texto.trim();
  const mitad = t.length / 2;
  if (Number.isInteger(mitad) && t.slice(0, mitad).trim() === t.slice(mitad).trim()) return t.slice(0, mitad);
  const pegadas = t.split(/(?<=[a-z0-9áéíóúñ)][.!?])(?=[A-ZÁÉÍÓÚÑ¿¡])/);
  return pegadas.length > 1 ? pegadas[0] : t;
}

/** Montos al formato peruano aunque el modelo escriba "S/ 1 000", "S/1200" o "S/ 95,79". */
export function formatoSoles(t: string) {
  const miles = (n: string) => n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return t.replace(/S\/\s?((?:\d{1,3}(?:[ \u00a0\u202f.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)(?!\d)/g, (_, num: string) => {
    const dec = num.match(/[.,](\d{1,2})$/);
    const entero = (dec ? num.slice(0, -dec[0].length) : num).replace(/[^\d]/g, '');
    return `S/ ${miles(entero)}${dec ? '.' + dec[1].padEnd(2, '0') : ''}`;
  });
}

function aParrafos(texto: string | null | undefined) {
  const parrafos = sinRepetir(formatoSoles(String(texto ?? '')))
    .replace(/\*\*|__|`/g, '')
    .split(/\n\s*\n|\n(?=[-•]\s)/)
    .map((p) => sinRepetir(p.replace(/^[-•]\s*/, '')))
    .filter(Boolean);
  return [...new Set(parrafos)];
}

export async function responderConIA(mensaje: string, perfil: Perfil): Promise<RespuestaBoot & { herramientas: string[] }> {
  const disponibles = herramientasDe(perfil);
  const mensajes: MensajeLLM[] = [{ role: 'system', content: instrucciones(perfil) }, ...historial[perfil], { role: 'user', content: mensaje }];
  const usadas: string[] = [];
  let tabla: Fila[] | null = null;
  let modelo = MODELO;

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    let msg;
    try {
      msg = await llamarGroq(mensajes, modelo, perfil);
    } catch (e) {
      if ((e as { status?: number }).status !== 429 || modelo === MODELO_RESPALDO) throw e;
      console.warn(`[Boot] ${modelo} llegó al límite, uso ${MODELO_RESPALDO}`);
      modelo = MODELO_RESPALDO;
      msg = await llamarGroq(mensajes, modelo, perfil);
    }

    if (!msg.tool_calls?.length) {
      const texto = aParrafos(msg.content);
      if (!texto.length) throw new Error('Respuesta vacía del modelo');
      historial[perfil].push({ role: 'user', content: mensaje }, { role: 'assistant', content: texto.join('\n\n') });
      historial[perfil].splice(0, Math.max(0, historial[perfil].length - MAX_HISTORIAL));
      return { texto, tabla: tabla ?? undefined, herramientas: usadas, fuente: 'groq' };
    }

    mensajes.push({ role: 'assistant', content: msg.content ?? null, tool_calls: msg.tool_calls });
    for (const llamada of msg.tool_calls) {
      let args: Args = {};
      try { args = JSON.parse(llamada.function.arguments || '{}') ?? {}; } catch { args = {}; }
      const h = disponibles.find((x) => x.name === llamada.function.name);
      const resultado: Resultado = h ? h.run(perfil, args) : { error: `Herramienta no disponible: ${llamada.function.name}` };
      usadas.push(llamada.function.name);
      if (h?.tabla && !resultado.error && resultado.ok !== false) tabla = h.tabla(resultado) ?? tabla;
      mensajes.push({ role: 'tool', tool_call_id: llamada.id, content: JSON.stringify(resultado) });
    }
  }
  throw new Error('El modelo no terminó de responder');
}
