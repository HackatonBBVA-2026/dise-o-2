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

/** A quién pertenece un movimiento. 'dividido' reparte el monto según pctNegocio. */
export type Ambito = 'personal' | 'negocio' | 'dividido';
export type Vista = 'personal' | 'negocio' | 'todo';

export interface Movimiento {
  id: string;
  dia: number;
  descripcion: string; // también es el nombre del comercio para las reglas
  categoria: string;
  monto: number;
  /** Ámbito registrado. Si clasificadoPor es 'boot' con confianza baja, es solo una sugerencia. */
  ambito: Ambito;
  pctNegocio?: number;
  clasificadoPor: 'usuario' | 'regla' | 'boot';
  confianza?: number; // 0–1, solo cuando clasificó Boot
  /** Movimiento que no está en el resumen personal base (llegó después y aún no se clasificó). */
  pendienteInicial?: boolean;
}

export interface ReglaComercio {
  comercio: string;
  ambito: Exclude<Ambito, 'dividido'>;
  creadaPor: 'usuario' | 'boot';
}

export interface Negocio {
  nombre: string;
  rucEnmascarado: string;
  rubro: string;
  regimen: 'NRUS' | 'RER' | 'RMT' | 'General';
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
