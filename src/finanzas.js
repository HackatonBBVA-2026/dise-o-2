// Lógica financiera determinista. La IA nunca inventa números: los toma de aquí.
const data = require('./data');

const r2 = (n) => Math.round(n * 100) / 100;
const sum = (arr, key = 'monto') => arr.reduce((acc, x) => acc + x[key], 0);

function disponible() {
  return r2(sum(data.cuentas, 'saldo'));
}

function proyeccionFinDeMes() {
  const pendientes = sum(data.proximosCobros.filter((c) => c.dia > data.hoy));
  const diasRestantes = data.cierreMes - data.hoy;
  const variable = data.gastoDiarioEstimado * diasRestantes;
  return { saldo: r2(disponible() - pendientes - variable), pendientes: r2(pendientes), variable, diasRestantes };
}

function semaforo(saldoProyectado) {
  if (saldoProyectado < 0) return { nivel: 'rojo', texto: 'No llegas' };
  if (saldoProyectado < 150) return { nivel: 'amarillo', texto: 'Llegas justo' };
  return { nivel: 'verde', texto: 'Vas bien' };
}

// Mismo comercio + mismo monto en suscripciones dentro del mes = posible duplicado.
function detectarDuplicados() {
  const grupos = {};
  data.movimientos
    .filter((m) => m.monto < 0 && m.categoria === 'Suscripciones')
    .forEach((m) => {
      const k = `${m.descripcion}|${m.monto}`;
      (grupos[k] = grupos[k] || []).push(m);
    });
  return Object.values(grupos)
    .filter((g) => g.length > 1)
    .map((g) => ({
      comercio: g[0].descripcion,
      monto: Math.abs(g[0].monto),
      dias: g.map((m) => m.dia).sort((a, b) => a - b),
    }));
}

function simularCompra(monto) {
  const sin = proyeccionFinDeMes().saldo;
  const con = r2(sin - monto);
  const riesgo = con < 0 ? 'Alto' : con < 150 ? 'Medio' : 'Bajo';
  // Pagar en 2 partes: este mes solo la mitad.
  const enDosPartes = r2(sin - monto / 2);
  return { sin, con, riesgo, enDosPartes };
}

function simularPrestamo(monto, meses = 12) {
  const r = Math.pow(1 + data.prestamoReferencial.tea, 1 / 12) - 1;
  const cuota = (m) => r2((monto * r) / (1 - Math.pow(1 + r, -m)));
  const c = cuota(meses);
  return {
    monto,
    meses,
    cuota: c,
    usoMargen: Math.round((c / data.sobrantePromedio6m) * 100),
    cuota18: cuota(18),
    sobrante: data.sobrantePromedio6m,
  };
}

function getResumen() {
  const proy = proyeccionFinDeMes();
  const sem = semaforo(proy.saldo);
  const duplicados = detectarDuplicados();
  const maxCat = Math.max(...data.categorias.map((c) => c.monto));

  const alertas = [];
  if (sem.nivel !== 'verde') {
    alertas.push({
      tipo: sem.nivel === 'rojo' ? 'peligro' : 'aviso',
      titulo: `${sem.texto} a fin de mes`,
      texto: `El ${data.cierreMes} te quedarían unos ${Math.round(proy.saldo) < 0 ? '-' : ''}S/ ${Math.abs(Math.round(proy.saldo))}.`,
      pregunta: '¿Llego a fin de mes?',
    });
  }
  duplicados.forEach((d) =>
    alertas.push({
      tipo: 'duplicado',
      titulo: '¿Cobro duplicado?',
      texto: `${d.comercio} te cobró S/ ${d.monto} el día ${d.dias.join(' y el ')}.`,
      pregunta: '¿Y el cobro duplicado?',
    })
  );

  return {
    disponible: disponible(),
    ingresos: data.ingresosMes,
    gastos: data.gastosMes,
    pctGasto: Math.min(100, Math.round((data.gastosMes / data.ingresosMes) * 100)),
    proyeccion: proy,
    semaforo: sem,
    cierreMes: data.cierreMes,
    cuentas: data.cuentas,
    categorias: data.categorias.map((c) => ({ ...c, pct: Math.round((c.monto / maxCat) * 100) })),
    proximosCobros: data.proximosCobros.filter((c) => c.dia > data.hoy),
    movimientos: data.movimientos,
    duplicados,
    alertas,
  };
}

function validarTransferencia({ destino, monto, cuentaId }) {
  const cuenta = data.cuentas.find((c) => c.id === cuentaId);
  const m = Number(monto);
  if (!cuenta) return { ok: false, error: 'Selecciona una cuenta de origen.' };
  if (!/^\d{10,20}$/.test(String(destino || '').replace(/[\s-]/g, '')))
    return { ok: false, error: 'Ingresa un número de cuenta o CCI válido (10 a 20 dígitos).' };
  if (!(m > 0)) return { ok: false, error: 'Ingresa un monto mayor a 0.' };
  if (m > cuenta.saldo) return { ok: false, error: 'El monto supera tu saldo disponible.' };
  return {
    ok: true,
    codigo: 'DEMO-' + Date.now().toString().slice(-6),
    mensaje: `Simulación: transferencia de S/ ${m.toFixed(2)} registrada. No se movió dinero real.`,
  };
}

module.exports = {
  getResumen,
  proyeccionFinDeMes,
  detectarDuplicados,
  simularCompra,
  simularPrestamo,
  validarTransferencia,
};
