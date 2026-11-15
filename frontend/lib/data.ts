// Datos 100% ficticios para el concepto. Reemplazar por la API real del banco.
import type {
  Usuario, Tarjeta, Cuenta, Categoria, Cobro, Suscripcion, Movimiento, EventoSeguridad, Negocio, ReglaComercio,
} from './types';
import { memoria } from './memoria';

export const usuario: Usuario = {
  nombre: 'Ana',
  apellido: 'Torres',
  email: 'ana.t****@correo.pe',
  telefono: '+51 9** *** 482',
  clienteDesde: 2021,
  nivel: 'Black Tier',
};

export const tarjeta: Tarjeta = { tipo: 'Débito', ultimos: '4821', vence: '09/29', titular: 'ANA TORRES' };

export const hoy = 14; // día actual del mes
export const cierreMes = 30;

export const ingresosMes = 1650;
export const gastosMes = 1301.9; // = suma de los gastos personales de `movimientos`
export const gastoDiarioEstimado = 47; // gasto variable promedio por día
export const sobrantePromedio6m = 310; // lo que sobra en promedio al mes (últimos 6 meses)

// En memoria compartida: separar ahorro (metas) descuenta del saldo y todas las pantallas lo ven.
export const cuentas: Cuenta[] = memoria('cuentas', () => [{ id: 'ah-4821', tipo: 'Cuenta de ahorros', numero: '4821', saldo: 1024.5 }]);

export const categorias: Categoria[] = [
  { nombre: 'Vivienda', monto: 450 },
  { nombre: 'Comida', monto: 380 },
  { nombre: 'Suscripciones', monto: 173.9, alerta: true },
  { nombre: 'Transporte', monto: 160 },
  { nombre: 'Otros', monto: 138 },
];

export const proximosCobros: Cobro[] = [
  { nombre: 'NUBE+', dia: 22, monto: 39.9 },
  { nombre: 'Luz', dia: 24, monto: 84.6 },
  { nombre: 'Internet hogar', dia: 26, monto: 87 },
];

export const suscripciones: Suscripcion[] = [
  { nombre: 'STREAMFLIX', monto: 30 },
  { nombre: 'NUBE+', monto: 39.9 },
  { nombre: 'MusiPlay', monto: 24.9 },
  { nombre: 'Gimnasio', monto: 89 },
];

// Una sola cuenta con movimientos personales y del negocio (la bodega de Ana).
// Los que tienen pendienteInicial llegaron hace poco y Boot no está seguro: van a 'Por clasificar'.
export const movimientos: Movimiento[] = [
  // Llegaron hace poco: los clasifica el modelo de ML (lib/ml). Si duda, van a 'Por clasificar'.
  { id: 'm-20', dia: 13, banco: 'MAKRO MAYORISTA', medio: 'tarjeta', descripcion: 'Makro Mayorista', categoria: 'Compras mayoristas', monto: -210, ambito: 'negocio', clasificadoPor: 'boot', pendienteInicial: true },
  { id: 'm-19', dia: 12, banco: 'TRANSF A CARLOS M', medio: 'transferencia', descripcion: 'Transferencia a Carlos M.', categoria: 'Pago a ayudante', monto: -75, ambito: 'negocio', clasificadoPor: 'boot', pendienteInicial: true },
  { id: 'm-18', dia: 8, banco: 'MERCADO CENTRAL', medio: 'tarjeta', descripcion: 'Mercado Central', categoria: 'Comida', monto: -96, ambito: 'dividido', pctNegocio: 50, clasificadoPor: 'boot', pendienteInicial: true },

  // Negocio
  { id: 'n-08', dia: 12, banco: 'ABONO VENTAS QR', medio: 'qr', descripcion: 'Ventas QR · Bodega Ana', categoria: 'Ventas', monto: 365, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-07', dia: 11, banco: 'DISTRIBUIDORA MAYORISTA LIMA', medio: 'tarjeta', descripcion: 'Distribuidora Mayorista Lima', categoria: 'Mercadería', monto: -455, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-06', dia: 9, banco: 'ABONO VENTAS QR', medio: 'qr', descripcion: 'Ventas QR · Bodega Ana', categoria: 'Ventas', monto: 410, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-05', dia: 7, banco: 'EMPAQUES DEL NORTE SAC', medio: 'tarjeta', descripcion: 'Empaques del Norte', categoria: 'Insumos', monto: -48, ambito: 'negocio', clasificadoPor: 'usuario' },
  { id: 'n-04', dia: 5, banco: 'ABONO VENTAS QR', medio: 'qr', descripcion: 'Ventas QR · Bodega Ana', categoria: 'Ventas', monto: 280, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-03', dia: 4, banco: 'TRANSPORTES RAPIDO SRL', medio: 'transferencia', descripcion: 'Transportes Rápido', categoria: 'Flete', monto: -35, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-02', dia: 4, banco: 'DISTRIBUIDORA MAYORISTA LIMA', medio: 'tarjeta', descripcion: 'Distribuidora Mayorista Lima', categoria: 'Mercadería', monto: -480, ambito: 'negocio', clasificadoPor: 'regla' },
  { id: 'n-01', dia: 2, banco: 'ABONO VENTAS QR', medio: 'qr', descripcion: 'Ventas QR · Bodega Ana', categoria: 'Ventas', monto: 320, ambito: 'negocio', clasificadoPor: 'regla' },

  // Personal
  // Los movimientos personales suman exactamente los totales de `categorias` (el reporte por correo los lista uno por uno).
  { id: 'p-23', dia: 13, banco: 'CHIFA DRAGON DORADO', medio: 'tarjeta', descripcion: 'Chifa Dragón Dorado', categoria: 'Comida', monto: -39.5, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-09', dia: 13, banco: 'SUPERMERCADO PLAZA', medio: 'tarjeta', descripcion: 'Supermercado Plaza', categoria: 'Comida', monto: -86.4, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-22', dia: 13, banco: 'MOVIRIDE*VIAJE', medio: 'tarjeta', descripcion: 'Moviride', categoria: 'Transporte', monto: -14, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-08', dia: 12, banco: 'TRANSF A LUIS R', medio: 'transferencia', descripcion: 'Transferencia a Luis R.', categoria: 'Otros', monto: -120, ambito: 'personal', clasificadoPor: 'usuario' },
  { id: 'p-21', dia: 11, banco: 'PANADERIA SAN JOSE', medio: 'tarjeta', descripcion: 'Panadería San José', categoria: 'Comida', monto: -9.5, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-07', dia: 11, banco: 'TAXIYAVIAJE', medio: 'qr', descripcion: 'Taxi app', categoria: 'Transporte', monto: -18.5, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-20', dia: 10, banco: 'MUSIPLAY', medio: 'tarjeta', descripcion: 'MusiPlay', categoria: 'Suscripciones', monto: -24.9, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-06', dia: 10, banco: 'PAGO QR CAFE CENTRAL', medio: 'qr', descripcion: 'Pago QR · Café Central', categoria: 'Comida', monto: -14, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-19', dia: 9, banco: 'MAXIAHORRO 79', medio: 'tarjeta', descripcion: 'Maxiahorro', categoria: 'Comida', monto: -79.2, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-18', dia: 9, banco: 'TAXIYAVIAJE', medio: 'qr', descripcion: 'Taxi app', categoria: 'Transporte', monto: -21, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-05', dia: 8, banco: 'STREAMFLIX', medio: 'tarjeta', descripcion: 'STREAMFLIX', categoria: 'Suscripciones', monto: -30, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-17', dia: 7, banco: 'RAPIDOO*PEDIDO', medio: 'tarjeta', descripcion: 'Rapidoo · Pedido', categoria: 'Comida', monto: -46.9, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-16', dia: 7, banco: 'GRIFO VIAPLUS', medio: 'tarjeta', descripcion: 'Grifo ViaPlus', categoria: 'Transporte', monto: -60, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-04', dia: 6, banco: 'GIMNASIO', medio: 'debito', descripcion: 'Gimnasio', categoria: 'Suscripciones', monto: -89, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-15', dia: 6, banco: 'MENU DONA LUCHA', medio: 'tarjeta', descripcion: 'Menú Doña Lucha', categoria: 'Comida', monto: -14, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-03', dia: 5, banco: 'STREAMFLIX', medio: 'tarjeta', descripcion: 'STREAMFLIX', categoria: 'Suscripciones', monto: -30, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-14', dia: 5, banco: 'RECARGA TARJETA BUS', medio: 'qr', descripcion: 'Recarga tarjeta bus', categoria: 'Transporte', monto: -30, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-13', dia: 4, banco: 'POLLERIA EL BRASERO', medio: 'tarjeta', descripcion: 'Pollería El Brasero', categoria: 'Comida', monto: -58, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-12', dia: 3, banco: 'LIBRERIA CENTRAL', medio: 'tarjeta', descripcion: 'Librería Central', categoria: 'Otros', monto: -18, ambito: 'personal', clasificadoPor: 'usuario' },
  { id: 'p-02', dia: 3, banco: 'ALQUILER DPTO', medio: 'transferencia', descripcion: 'Alquiler', categoria: 'Vivienda', monto: -450, ambito: 'personal', clasificadoPor: 'usuario' },
  { id: 'p-11', dia: 2, banco: 'MINIMARKET 24H', medio: 'tarjeta', descripcion: 'Minimarket 24H', categoria: 'Comida', monto: -32.5, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-10', dia: 2, banco: 'TAXIYAVIAJE', medio: 'qr', descripcion: 'Taxi app', categoria: 'Transporte', monto: -16.5, ambito: 'personal', clasificadoPor: 'regla' },
  { id: 'p-01', dia: 1, banco: 'PLANILLA HABERES', medio: 'transferencia', descripcion: 'Sueldo', categoria: 'Ingreso', monto: 1650, ambito: 'personal', clasificadoPor: 'usuario' },
];

export const negocio: Negocio = {
  nombre: 'Bodega Ana',
  rucEnmascarado: '10•••••••24', // RUC de demo: 10456789124
  rubro: 'Bodega',
  regimen: 'NRUS',
};

// Reglas por comercio que ya existen. El usuario puede crear y borrar más desde la app.
export const reglasBase: ReglaComercio[] = [
  { comercio: 'Distribuidora Mayorista Lima', ambito: 'negocio', creadaPor: 'usuario' },
  { comercio: 'Ventas QR · Bodega Ana', ambito: 'negocio', creadaPor: 'boot' },
  { comercio: 'Transportes Rápido', ambito: 'negocio', creadaPor: 'boot' },
  { comercio: 'Supermercado Plaza', ambito: 'personal', creadaPor: 'usuario' },
];

export const seguridad: EventoSeguridad[] = [
  { titulo: 'Nuevo inicio de sesión', detalle: 'Chrome en Windows · Lima', cuando: 'Hoy, 09:12' },
  { titulo: 'Clave de internet actualizada', detalle: 'Desde la app', cuando: '2 nov' },
];


export const prestamoReferencial = { tea: 0.3 }; // TEA ficticia solo para simular
