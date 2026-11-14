export type Nivel = 'verde' | 'amarillo' | 'rojo';
export type TipoAlerta = 'aviso' | 'peligro' | 'duplicado';
export type Tono = 'rojo' | 'amarillo' | 'verde' | '';

export interface Usuario {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  clienteDesde: number;
  nivel: string;
}

export interface Tarjeta {
  tipo: string;
  ultimos: string;
  vence: string;
  titular: string;
}

export interface Cuenta {
  id: string;
  tipo: string;
  numero: string;
  saldo: number;
}

export interface Categoria {
  nombre: string;
  monto: number;
  alerta?: boolean;
}

export interface Cobro {
  nombre: string;
  dia: number;
  monto: number;
}

export interface Suscripcion {
  nombre: string;
  monto: number;
}

export interface Movimiento {
  dia: number;
  descripcion: string;
  categoria: string;
  monto: number;
}

export interface EventoSeguridad {
  titulo: string;
  detalle: string;
  cuando: string;
}

export interface TipoCambio {
  compra: number;
  venta: number;
}

export interface Alerta {
  tipo: TipoAlerta;
  titulo: string;
  corto: string;
  texto: string;
  pregunta: string;
}

export interface Duplicado {
  comercio: string;
  monto: number;
  dias: number[];
}

/** Respuesta de Boot: el servidor calcula, el cliente solo pinta. */
export interface RespuestaBoot {
  texto?: string[];
  lista?: string[];
  tabla?: { label: string; valor: string; tono?: Tono }[];
  nota?: string;
  chips?: string[];
}
