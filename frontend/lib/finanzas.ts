// Lógica financiera determinista. La IA nunca inventa números: los toma de aquí.
import * as data from './data';
import { r2 } from './format';
import type { Alerta, Duplicado, Nivel } from './types';

const sum = <T>(arr: T[], key: keyof T) => arr.reduce((acc, x) => acc + Number(x[key]), 0);

export function disponible() {
  return r2(sum(data.cuentas, 'saldo'));
}

export function proyeccionFinDeMes() {
  const pendientes = sum(data.proximosCobros.filter((c) => c.dia > data.hoy), 'monto');
  const diasRestantes = data.cierreMes - data.hoy;
  const variable = data.gastoDiarioEstimado * diasRestantes;
  return { saldo: r2(disponible() - pendientes - variable), pendientes: r2(pendientes), variable, diasRestantes };
}

export function semaforo(saldoProyectado: number): { nivel: Nivel; texto: string } {
  if (saldoProyectado < 0) return { nivel: 'rojo', texto: 'No llegas' };
  if (saldoProyectado < 150) return { nivel: 'amarillo', texto: 'Llegas justo' };
  return { nivel: 'verde', texto: 'Vas bien' };
}

/** Mismo comercio + mismo monto en suscripciones dentro del mes = posible duplicado. */
export function detectarDuplicados(): Duplicado[] {
  const grupos: Record<string, typeof data.movimientos> = {};
  data.movimientos
    .filter((m) => m.monto < 0 && m.categoria === 'Suscripciones')
    .forEach((m) => {
      const k = `${m.descripcion}|${m.monto}`;
      (grupos[k] ??= []).push(m);
    });
  return Object.values(grupos)
    .filter((g) => g.length > 1)
    .map((g) => ({
      comercio: g[0].descripcion,
      monto: Math.abs(g[0].monto),
      dias: g.map((m) => m.dia).sort((a, b) => a - b),
    }));
}

export function simularCompra(monto: number) {
  const sin = proyeccionFinDeMes().saldo;
  const con = r2(sin - monto);
  const riesgo = con < 0 ? 'Alto' : con < 150 ? 'Medio' : 'Bajo';
  const enDosPartes = r2(sin - monto / 2); // este mes solo la mitad
  return { sin, con, riesgo, enDosPartes } as const;
}

export function simularPrestamo(monto: number, meses = 12) {
  const r = Math.pow(1 + data.prestamoReferencial.tea, 1 / 12) - 1;
  const cuota = (m: number) => r2((monto * r) / (1 - Math.pow(1 + r, -m)));
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

export function getResumen() {
  const proy = proyeccionFinDeMes();
  const sem = semaforo(proy.saldo);
  const duplicados = detectarDuplicados();

  const alertas: Alerta[] = [];
  if (sem.nivel !== 'verde') {
    const s = Math.round(proy.saldo);
    alertas.push({
      tipo: sem.nivel === 'rojo' ? 'peligro' : 'aviso',
      titulo: `${sem.texto} a fin de mes`,
      corto: 'Fin de mes',
      texto: `El ${data.cierreMes} te quedarían unos ${s < 0 ? '−' : ''}S/ ${Math.abs(s)}.`,
      pregunta: '¿Llego a fin de mes?',
    });
  }
  duplicados.forEach((d) =>
    alertas.push({
      tipo: 'duplicado',
      titulo: '¿Cobro duplicado?',
      corto: 'Cobro duplicado',
      texto: `${d.comercio} te cobró S/ ${d.monto} el día ${d.dias.join(' y el ')}.`,
      pregunta: '¿Y el cobro duplicado?',
    })
  );

  return {
    disponible: disponible(),
    ingresos: data.ingresosMes,
    gastos: data.gastosMes,
    neto: r2(data.ingresosMes - data.gastosMes),
    pctGasto: Math.min(100, Math.round((data.gastosMes / data.ingresosMes) * 100)),
    proyeccion: proy,
    semaforo: sem,
    hoy: data.hoy,
    cierreMes: data.cierreMes,
    cuentas: data.cuentas,
    // pct = participación en el gasto total del mes (suma 100)
    categorias: data.categorias.map((c) => ({ ...c, pct: r2((c.monto / data.gastosMes) * 100) })),
    proximosCobros: data.proximosCobros.filter((c) => c.dia > data.hoy),
    movimientos: data.movimientos,
    duplicados,
    alertas,
  };
}

export type Resumen = ReturnType<typeof getResumen>;

export function validarTransferencia(body: { destino?: unknown; monto?: unknown; cuentaId?: unknown }) {
  const cuenta = data.cuentas.find((c) => c.id === body.cuentaId);
  const m = Number(body.monto);
  if (!cuenta) return { ok: false as const, error: 'Selecciona una cuenta de origen.' };
  if (!/^\d{10,20}$/.test(String(body.destino ?? '').replace(/[\s-]/g, '')))
    return { ok: false as const, error: 'Ingresa un número de cuenta o CCI válido (10 a 20 dígitos).' };
  if (!(m > 0)) return { ok: false as const, error: 'Ingresa un monto mayor a 0.' };
  if (m > cuenta.saldo) return { ok: false as const, error: 'El monto supera tu saldo disponible.' };
  return {
    ok: true as const,
    codigo: 'DEMO-' + Date.now().toString().slice(-6),
    mensaje: `Simulación: transferencia de S/ ${m.toFixed(2)} registrada. No se movió dinero real.`,
  };
}
