// Préstamos, tarjetas y beneficios de Numa para cada perfil (PRODUCTOS Y TASAS FICTICIOS de la demo).
// Mío no inventa ofertas: los montos preaprobados salen de los datos del usuario con reglas simples y prudentes:
//   - la cuota de un préstamo no pasa del 40% de lo que le sobra al mes (persona) o de la ganancia del negocio (RUC);
//   - la línea de la tarjeta se basa en los ingresos (persona) o en las ventas del mes (negocio).
import * as data from './data';
import * as f from './finanzas';
import { ESTADO_VACIO, clasificarTodos, pendientes, resumenNegocio } from './clasificacion';
import { verOfertas } from './ahorro';
import { r2 } from './format';
import type { Perfil } from './sesion';

export type TipoProducto = 'prestamo' | 'tarjeta' | 'beneficio';
export type EstadoProducto = 'preaprobado' | 'disponible' | 'desbloqueado' | 'no por ahora';

export interface Producto {
  tipo: TipoProducto;
  nombre: string;
  estado: EstadoProducto;
  /** Monto preaprobado o línea de crédito, si aplica. */
  monto?: number;
  detalle: string;
  /** Por qué Mío lo ofrece, con los datos del usuario. */
  porQue: string;
  condiciones?: string;
}

const AVISO = 'Productos y tasas ficticios de la demo, sujetos a evaluación. No es una oferta real.';
const TEA_PRESTAMO = data.prestamoReferencial.tea; // 30% (ficticia), la misma de simular_prestamo
const TEA_TARJETA = 0.499; // ficticia
const CUOTA_MAX = 0.4; // de lo que sobra o de la ganancia

const cien = (n: number) => Math.max(0, Math.floor(n / 100) * 100);

/** Monto máximo de préstamo para una cuota y un plazo dados (sistema francés). */
function montoPorCuota(cuota: number, meses: number) {
  const r = Math.pow(1 + TEA_PRESTAMO, 1 / 12) - 1;
  return (cuota * (1 - Math.pow(1 + r, -meses))) / r;
}

function beneficiosDesbloqueados(perfil: Perfil): Producto[] {
  const o = verOfertas(perfil).ofertas;
  const ya = o.filter((x) => x.desbloqueada);
  const sig = o.find((x) => !x.desbloqueada);
  const lista: Producto[] = ya.map((x) => ({
    tipo: 'beneficio',
    nombre: x.titulo,
    estado: 'desbloqueado',
    detalle: `${x.beneficio} con ${x.socio}.`,
    porQue: 'Lo desbloqueaste con tu ahorro.',
  }));
  if (sig) {
    lista.push({
      tipo: 'beneficio',
      nombre: sig.titulo,
      estado: 'no por ahora',
      detalle: `${sig.beneficio} con ${sig.socio}.`,
      porQue: `Te faltan S/ ${sig.falta} de ahorro para desbloquearlo (unos ${sig.mesesEstimados} meses a tu ritmo).`,
    });
  }
  return lista;
}

export function verProductos(perfil: Perfil, tipo?: unknown) {
  const lista: Producto[] = [];
  const semaforo = f.semaforo(f.proyeccionFinDeMes().saldo);

  if (perfil === 'empresa') {
    const movs = clasificarTodos(ESTADO_VACIO);
    const n = resumenNegocio(movs);
    const porClasificar = pendientes(movs).length;
    const cuota = Math.round(Math.max(0, n.resultado) * CUOTA_MAX);
    const monto12 = cien(montoPorCuota(cuota, 12));
    const monto18 = cien(montoPorCuota(cuota, 18));
    lista.push({
      tipo: 'prestamo',
      nombre: 'Préstamo Capital de Trabajo',
      estado: n.resultado > 0 && monto12 >= 500 ? 'preaprobado' : 'no por ahora',
      monto: monto12,
      detalle: `Hasta S/ ${monto12} a 12 meses (cuota ~S/ ${cuota}) o S/ ${monto18} a 18 meses, para comprar mercadería.`,
      porQue: `Tu bodega gana S/ ${n.resultado} este mes; la cuota se queda en el 40% de esa ganancia.`,
      condiciones: `TEA referencial ${Math.round(TEA_PRESTAMO * 100)}% (ficticia). Sin garantía.`,
    });
    const linea = cien(n.ventas);
    lista.push({
      tipo: 'tarjeta',
      nombre: 'Tarjeta de Crédito Negocios',
      estado: n.ventas >= 1000 ? 'preaprobado' : 'no por ahora',
      monto: linea,
      detalle: `Línea de S/ ${linea}. Sus compras se marcan solas como gastos del negocio y tienes hasta 45 días para pagar la mercadería.`,
      porQue: `Tu negocio vendió S/ ${n.ventas} este mes.`,
      condiciones: `TEA referencial ${r2(TEA_TARJETA * 100)}% (ficticia). Sin membresía el primer año.`,
    });
    lista.push(...beneficiosDesbloqueados(perfil));
    return filtrar(lista, tipo, {
      consejo: porClasificar
        ? `Si clasificas tus ${porClasificar} movimientos pendientes, la evaluación usa números más exactos.`
        : 'Tus movimientos están clasificados: la evaluación usa tus números reales.',
    });
  }

  // Persona (DNI)
  const sobrante = data.sobrantePromedio6m;
  const cuota = Math.round(sobrante * CUOTA_MAX);
  const monto12 = cien(montoPorCuota(cuota, 12));
  const monto18 = cien(montoPorCuota(cuota, 18));
  lista.push({
    tipo: 'prestamo',
    nombre: 'Préstamo Personal',
    estado: monto12 >= 500 ? 'preaprobado' : 'no por ahora',
    monto: monto12,
    detalle: `Hasta S/ ${monto12} a 12 meses (cuota ~S/ ${cuota}) o S/ ${monto18} a 18 meses.`,
    porQue: `Te sobran en promedio S/ ${sobrante} al mes; la cuota se queda en el 40% de eso.`,
    condiciones: `TEA referencial ${Math.round(TEA_PRESTAMO * 100)}% (ficticia).`,
  });
  const linea = cien(data.ingresosMes * 1.5);
  lista.push({
    tipo: 'tarjeta',
    nombre: 'Tarjeta de Crédito Numa Clásica',
    estado: data.ingresosMes >= 1000 ? 'preaprobado' : 'no por ahora',
    monto: linea,
    detalle: `Línea de S/ ${linea}, sin membresía el primer año y 3 cuotas sin intereses en compras desde S/ 300.`,
    porQue: `Tus ingresos son de S/ ${data.ingresosMes} al mes.`,
    condiciones: `TEA referencial ${r2(TEA_TARJETA * 100)}% (ficticia).`,
  });
  lista.push(...beneficiosDesbloqueados(perfil));
  return filtrar(lista, tipo, {
    consejo:
      semaforo.nivel === 'verde'
        ? 'Vas bien este mes: una cuota que entre en tu margen no te complica.'
        : `Este mes ${semaforo.texto.toLowerCase()} a fin de mes: si tomas un préstamo, mejor a más meses para que la cuota sea menor.`,
  });
}

function filtrar(lista: Producto[], tipo: unknown, extra: { consejo: string }) {
  const t = tipo === 'prestamo' || tipo === 'tarjeta' || tipo === 'beneficio' ? tipo : null;
  return { productos: t ? lista.filter((p) => p.tipo === t) : lista, ...extra, aviso: AVISO };
}
