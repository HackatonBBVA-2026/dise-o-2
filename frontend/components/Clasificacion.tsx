'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ESTADO_VACIO,
  clasificarTodos,
  pendientes as filtrarPendientes,
  reglasActivas,
  resumenNegocio,
  resumenPersonal,
  type EstadoClasificacion,
  type MovimientoClasificado,
} from '@/lib/clasificacion';
import type { Ambito, ReglaComercio, Vista } from '@/lib/types';

const KEY = 'boot.clasificacion';
const KEY_VISTA = 'boot.vista';

interface Ctx {
  movimientos: MovimientoClasificado[];
  pendientes: MovimientoClasificado[];
  personal: ReturnType<typeof resumenPersonal>;
  negocio: ReturnType<typeof resumenNegocio>;
  reglas: ReglaComercio[];
  vista: Vista;
  setVista: (v: Vista) => void;
  /** Marca un movimiento. Con `recordar`, crea una regla para todo ese comercio. */
  clasificarMovimiento: (id: string, ambito: Ambito, opciones?: { pctNegocio?: number; recordar?: boolean }) => void;
  eliminarRegla: (comercio: string) => void;
  restablecer: () => void;
}

const ClasCtx = createContext<Ctx | null>(null);

export function useClasificacion() {
  const ctx = useContext(ClasCtx);
  if (!ctx) throw new Error('useClasificacion debe usarse dentro de <ClasificacionProvider>');
  return ctx;
}

/**
 * Estado de personal vs. negocio para toda la app.
 * Hoy se guarda en este navegador; con el backend, cada cambio será una llamada a la API.
 */
export function ClasificacionProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoClasificacion>(ESTADO_VACIO);
  const [vista, setVistaState] = useState<Vista>('personal');

  useEffect(() => {
    try {
      const e = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (e) setEstado({ ...ESTADO_VACIO, ...e });
      const v = localStorage.getItem(KEY_VISTA);
      if (v === 'personal' || v === 'negocio' || v === 'todo') setVistaState(v);
    } catch {
      /* sin almacenamiento: se empieza desde cero */
    }
  }, []);

  const guardar = useCallback((fn: (e: EstadoClasificacion) => EstadoClasificacion) => {
    setEstado((prev) => {
      const nuevo = fn(prev);
      try { localStorage.setItem(KEY, JSON.stringify(nuevo)); } catch { /* sin almacenamiento */ }
      return nuevo;
    });
  }, []);

  const setVista = useCallback((v: Vista) => {
    setVistaState(v);
    try { localStorage.setItem(KEY_VISTA, v); } catch { /* sin almacenamiento */ }
  }, []);

  const movimientos = useMemo(() => clasificarTodos(estado), [estado]);

  const clasificarMovimiento = useCallback<Ctx['clasificarMovimiento']>(
    (id, ambito, opciones = {}) => {
      const comercio = movimientos.find((m) => m.id === id)?.descripcion;
      guardar((e) => {
        const sig: EstadoClasificacion = {
          ...e,
          overrides: { ...e.overrides, [id]: { ambito, pctNegocio: ambito === 'dividido' ? opciones.pctNegocio ?? 50 : undefined } },
        };
        if (opciones.recordar && comercio && ambito !== 'dividido') {
          sig.reglasUsuario = [...e.reglasUsuario.filter((r) => r.comercio !== comercio), { comercio, ambito, creadaPor: 'usuario' }];
          sig.reglasEliminadas = e.reglasEliminadas.filter((c) => c !== comercio);
          // La regla manda para todo el comercio: se quitan los ajustes sueltos de ese comercio.
          for (const m of movimientos) if (m.descripcion === comercio && m.id !== id) delete sig.overrides[m.id];
        }
        return sig;
      });
    },
    [guardar, movimientos]
  );

  const eliminarRegla = useCallback(
    (comercio: string) =>
      guardar((e) => ({
        ...e,
        reglasUsuario: e.reglasUsuario.filter((r) => r.comercio !== comercio),
        reglasEliminadas: [...new Set([...e.reglasEliminadas, comercio])],
      })),
    [guardar]
  );

  const restablecer = useCallback(() => guardar(() => ESTADO_VACIO), [guardar]);

  const valor = useMemo<Ctx>(
    () => ({
      movimientos,
      pendientes: filtrarPendientes(movimientos),
      personal: resumenPersonal(movimientos),
      negocio: resumenNegocio(movimientos),
      reglas: reglasActivas(estado),
      vista,
      setVista,
      clasificarMovimiento,
      eliminarRegla,
      restablecer,
    }),
    [movimientos, estado, vista, setVista, clasificarMovimiento, eliminarRegla, restablecer]
  );

  return <ClasCtx.Provider value={valor}>{children}</ClasCtx.Provider>;
}
