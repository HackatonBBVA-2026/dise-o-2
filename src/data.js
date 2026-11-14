// Datos 100% ficticios para el concepto. Reemplazar por la API real del banco.
module.exports = {
  usuario: {
    nombre: 'Ana',
    apellido: 'Torres',
    email: 'ana.t****@correo.pe',
    telefono: '+51 9** *** 482',
    clienteDesde: 2021,
    nivel: 'Black Tier',
  },

  tarjeta: { tipo: 'Débito', ultimos: '4821', vence: '09/29', titular: 'ANA TORRES' },

  hoy: 14, // día actual del mes
  cierreMes: 30,

  ingresosMes: 1650,
  gastosMes: 1342,
  gastoDiarioEstimado: 47, // gasto variable promedio por día (comida, transporte...)
  sobrantePromedio6m: 310, // lo que sobra en promedio al mes (últimos 6 meses)

  cuentas: [{ id: 'ah-4821', tipo: 'Cuenta de ahorros', numero: '4821', saldo: 1024.5 }],

  categorias: [
    { nombre: 'Vivienda', monto: 450 },
    { nombre: 'Comida', monto: 380 },
    { nombre: 'Suscripciones', monto: 214, alerta: true },
    { nombre: 'Transporte', monto: 160 },
    { nombre: 'Otros', monto: 138 },
  ],

  proximosCobros: [
    { nombre: 'NUBE+', dia: 22, monto: 39.9 },
    { nombre: 'Luz', dia: 24, monto: 84.6 },
    { nombre: 'Internet hogar', dia: 26, monto: 87 },
  ],

  suscripciones: [
    { nombre: 'STREAMFLIX', monto: 30 },
    { nombre: 'NUBE+', monto: 39.9 },
    { nombre: 'MusiPlay', monto: 24.9 },
    { nombre: 'Gimnasio', monto: 89 },
  ],

  movimientos: [
    { dia: 13, descripcion: 'Supermercado Plaza', categoria: 'Comida', monto: -86.4 },
    { dia: 12, descripcion: 'Transferencia a Luis R.', categoria: 'Transferencia', monto: -120 },
    { dia: 11, descripcion: 'Taxi app', categoria: 'Transporte', monto: -18.5 },
    { dia: 10, descripcion: 'Pago QR · Café Central', categoria: 'Comida', monto: -14 },
    { dia: 8, descripcion: 'STREAMFLIX', categoria: 'Suscripciones', monto: -30 },
    { dia: 6, descripcion: 'Gimnasio', categoria: 'Suscripciones', monto: -89 },
    { dia: 5, descripcion: 'STREAMFLIX', categoria: 'Suscripciones', monto: -30 },
    { dia: 3, descripcion: 'Alquiler', categoria: 'Vivienda', monto: -450 },
    { dia: 1, descripcion: 'Sueldo', categoria: 'Ingreso', monto: 1650 },
  ],

  seguridad: [
    { titulo: 'Nuevo inicio de sesión', detalle: 'Chrome en Windows · Lima', cuando: 'Hoy, 09:12' },
    { titulo: 'Clave de internet actualizada', detalle: 'Desde la app', cuando: '2 nov' },
  ],

  tipoCambio: { compra: 3.72, venta: 3.76 },

  prestamoReferencial: { tea: 0.3 }, // TEA ficticia solo para simular
};
