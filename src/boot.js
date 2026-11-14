// Motor de respuestas de Boot. Detecta la intención, calcula con finanzas.js
// y devuelve texto + tabla. Aquí se conectaría un LLM para redactar la explicación
// a partir de estos mismos números (nunca para calcularlos).
const data = require('./data');
const f = require('./finanzas');

const S = (n) => {
  const dec = Number.isInteger(n) ? 0 : 2;
  return (n < 0 ? '- ' : '') + 'S/ ' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

const normalizar = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function extraerMonto(t) {
  const m = t.match(/(\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.\d+)?/);
  return m ? parseFloat(m[0].replace(/[,\s]/g, '')) : null;
}

const CHIPS_BASE = ['¿Llego a fin de mes?', 'Mis suscripciones', 'Fondo de emergencia'];

const intenciones = [
  {
    test: (t) => /duplicad|doble cobro|cobraron dos/.test(t),
    run: () => {
      const d = f.detectarDuplicados()[0];
      if (!d) return { texto: ['No encontré cobros duplicados este mes.'], chips: CHIPS_BASE };
      const proy = f.proyeccionFinDeMes().saldo;
      return {
        texto: [
          `${d.comercio} te cobró S/ ${d.monto} el ${d.dias.join(' y el ')}. Si lo reclamas y te lo devuelven, al ${data.cierreMes} tendrías ${S(Math.round(proy + d.monto))}.`,
          '¿Te explico cómo reclamar?',
        ],
        chips: ['Sí, explícame', 'Ver mis suscripciones'],
      };
    },
  },
  {
    test: (t) => /explica|reclam/.test(t),
    run: () => ({
      texto: ['Para reclamar un cobro duplicado:'],
      lista: [
        'Entra a Operaciones › Movimientos y ubica ambos cargos.',
        'Escríbele primero al comercio: suelen devolver en 3–5 días.',
        'Si no responde, presenta el reclamo al banco con la fecha y el monto.',
        'Guarda el número de reclamo para hacer seguimiento.',
      ],
      chips: ['¿Llego a fin de mes?'],
    }),
  },
  {
    test: (t) => /prestamo/.test(t),
    run: (t) => {
      const p = f.simularPrestamo(extraerMonto(t) || 3000, 12);
      const ajustado = p.usoMargen >= 80;
      return {
        texto: [`Según tus últimos 6 meses, te sobran en promedio S/ ${p.sobrante} al mes.`],
        tabla: [
          { label: 'Préstamo ejemplo (ficticio)', valor: S(p.monto) },
          { label: `Cuota estimada · ${p.meses} meses`, valor: S(Math.round(p.cuota)) },
          { label: 'Usaría de tu margen', valor: `${p.usoMargen}%`, tono: ajustado ? 'rojo' : 'verde' },
        ],
        nota: ajustado
          ? `Es muy ajustado. Con 18 meses la cuota baja a ~${S(Math.round(p.cuota18))}. Es una simulación, no una oferta.`
          : 'Entra en tu margen. Es una simulación, no una oferta.',
        chips: CHIPS_BASE,
      };
    },
  },
  {
    test: (t) => /tarjeta/.test(t),
    run: () => ({
      texto: ['Antes de pedirla, revisa:'],
      lista: [
        'Tu reporte de deudas en la SBS',
        'La TCEA, no solo la tasa',
        'Si cobra membresía',
        'Fecha de corte y fecha de pago',
      ],
      nota: 'Tip: paga el total, no el mínimo.',
      chips: CHIPS_BASE,
    }),
  },
  {
    test: (t) => /(gastar|comprar|compra|alcanza)/.test(t) && extraerMonto(t) !== null,
    run: (t) => {
      const monto = extraerMonto(t);
      const s = f.simularCompra(monto);
      const texto = [`Hoy tienes ${S(f.getResumen().disponible)}, pero aún vienen gastos y cobros fijos hasta el ${data.cierreMes}.`];
      const nota =
        s.riesgo === 'Bajo'
          ? 'Te alcanza sin problema. ¡Disfrútalo!'
          : `Te recomiendo esperar al sueldo del día 1. Si igual la quieres, pagar en 2 partes te deja en ${S(Math.round(s.enDosPartes))}.`;
      return {
        texto,
        tabla: [
          { label: `Al ${data.cierreMes}, sin la compra`, valor: S(Math.round(s.sin)) },
          { label: `Al ${data.cierreMes}, con la compra`, valor: S(Math.round(s.con)), tono: s.con < 0 ? 'rojo' : '' },
          { label: 'Riesgo de quedar en rojo', valor: s.riesgo, tono: s.riesgo === 'Alto' ? 'rojo' : s.riesgo === 'Medio' ? 'amarillo' : 'verde' },
        ],
        nota,
        chips: ['¿Y el cobro duplicado?', 'Fondo de emergencia'],
      };
    },
  },
  {
    test: (t) => /fin de mes|llego|alcanzo/.test(t),
    run: () => {
      const p = f.proyeccionFinDeMes();
      const r = f.getResumen();
      return {
        texto: [`${r.semaforo.texto}. Hice la cuenta así:`],
        tabla: [
          { label: 'Disponible hoy', valor: S(r.disponible) },
          { label: 'Cobros fijos que vienen', valor: S(-p.pendientes) },
          { label: `Gasto diario estimado × ${p.diasRestantes} días`, valor: S(-p.variable) },
          { label: `Te quedaría el ${data.cierreMes}`, valor: S(Math.round(p.saldo)), tono: r.semaforo.nivel },
        ],
        nota: 'Bajar S/ 5 al día en delivery te daría un colchón extra de ~S/ 80.',
        chips: ['¿Y el cobro duplicado?', 'Mis suscripciones'],
      };
    },
  },
  {
    test: (t) => /suscrip/.test(t),
    run: () => {
      const total = data.suscripciones.reduce((a, s) => a + s.monto, 0);
      return {
        texto: [`Tienes ${data.suscripciones.length} suscripciones activas por ${S(total)} al mes:`],
        tabla: data.suscripciones.map((s) => ({ label: s.nombre, valor: S(s.monto) })),
        nota: '¿Usas todas? Cancelar una que no usas es ahorro inmediato.',
        chips: ['¿Y el cobro duplicado?', 'Fondo de emergencia'],
      };
    },
  },
  {
    test: (t) => /emergencia|ahorr/.test(t),
    run: () => {
      const meta = data.gastosMes * 3;
      const mensual = Math.round(data.sobrantePromedio6m * 0.5);
      return {
        texto: ['Un fondo de emergencia cubre 3 meses de gastos sin depender de deudas.'],
        tabla: [
          { label: 'Meta (3 meses de gastos)', valor: S(meta) },
          { label: 'Ahorro sugerido al mes', valor: S(mensual) },
          { label: 'Tiempo estimado', valor: `${Math.ceil(meta / mensual)} meses` },
        ],
        nota: 'Separa el ahorro el mismo día que llega el sueldo, no lo que sobre.',
        chips: ['¿Llego a fin de mes?', 'Mis suscripciones'],
      };
    },
  },
];

function responder(mensaje) {
  const t = normalizar(mensaje);
  const intent = intenciones.find((i) => i.test(t));
  if (intent) return intent.run(t);
  return {
    texto: [
      `¡Hola, ${data.usuario.nombre}! Puedo simular un gasto antes de que lo hagas, revisar tus cobros o decirte si llegas a fin de mes.`,
      'Prueba con algo como: "¿Puedo gastar S/ 200 en unas zapatillas?"',
    ],
    chips: CHIPS_BASE,
  };
}

module.exports = { responder };
