'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from './Providers';

type Estado = 'cargando' | 'sin-soporte' | 'ios-instalar' | 'bloqueadas' | 'inactivas' | 'activas';

const base64AUint8 = (b64: string) => {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};

const esIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const soportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;

async function registro() {
  return (await navigator.serviceWorker.getRegistration('/')) ?? (await navigator.serviceWorker.register('/sw.js'));
}

async function clave(): Promise<string> {
  const r = await fetch('/api/push').then((x) => x.json());
  if (!r.disponible || !r.clave) throw new Error('sin-config');
  return r.clave;
}

const mismaClave = (sub: PushSubscription, k: string) => {
  const actual = sub.options.applicationServerKey;
  if (!actual) return false;
  const a = new Uint8Array(actual);
  const b = base64AUint8(k);
  return a.length === b.length && a.every((v, i) => v === b[i]);
};

/** Suscribe este dispositivo (o reutiliza su suscripción) y se la pasa al servidor. */
async function suscribir(): Promise<void> {
  const k = await clave();
  const reg = await registro();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !mismaClave(sub, k)) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(k) });
  const res = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: sub.toJSON() }) });
  if (!res.ok) throw new Error('registro');
}

/**
 * Va en el layout: si el usuario ya activó las notificaciones, vuelve a registrar este dispositivo
 * en el servidor al abrir la app (la demo guarda las suscripciones en memoria).
 */
export function SincronizarPush() {
  useEffect(() => {
    if (!soportado() || window.self !== window.top) return;
    const sincronizar = () => {
      if (Notification.permission !== 'granted' || document.visibilityState !== 'visible') return;
      suscribir().catch(() => { /* sin push: la app sigue igual */ });
    };
    sincronizar();
    // También al volver a la app (el servidor de la demo pudo reiniciarse mientras tanto).
    document.addEventListener('visibilitychange', sincronizar);
    return () => document.removeEventListener('visibilitychange', sincronizar);
  }, []);
  return null;
}

/** Panel de Perfil: activar, desactivar y probar las notificaciones push. */
export function Notificaciones({ esEmpresa }: { esEmpresa: boolean }) {
  const router = useRouter();
  const { toast } = useApp();
  const [estado, setEstado] = useState<Estado>('cargando');
  const [ocupado, setOcupado] = useState(false);

  const revisar = useCallback(async () => {
    if (!soportado()) return setEstado(esIOS() && !instalada() ? 'ios-instalar' : 'sin-soporte');
    if (Notification.permission === 'denied') return setEstado('bloqueadas');
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    setEstado(Notification.permission === 'granted' && sub ? 'activas' : 'inactivas');
  }, []);

  useEffect(() => { void revisar(); }, [revisar]);

  async function activar() {
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'bloqueadas' : 'inactivas');
        return;
      }
      await suscribir();
      setEstado('activas');
      toast('Notificaciones activadas.');
      await fetch('/api/push', { method: 'PUT' }); // avisa de una vez si alguna meta ya está cerca
    } catch (e) {
      toast((e as Error).message === 'sin-config' ? 'El servidor no tiene configuradas las notificaciones.' : 'No se pudieron activar las notificaciones.');
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    setOcupado(true);
    try {
      const sub = await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setEstado('inactivas');
      toast('Notificaciones desactivadas.');
    } finally {
      setOcupado(false);
    }
  }

  async function probar(tipo: 'recibida' | 'prueba', retraso: number) {
    setOcupado(true);
    try {
      const r = await fetch('/api/push/prueba', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo, retraso }) }).then((x) => x.json());
      if (!r.ok) {
        toast(r.error ?? 'No se pudo enviar la prueba.');
        return;
      }
      toast(retraso ? `Llega en ${retraso} s: sal de la app o bloquea el celular.` : 'Aviso enviado.');
      if (tipo === 'recibida') setTimeout(() => router.refresh(), retraso * 1000 + 1500);
    } catch {
      toast('No pude conectarme. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  }

  const textos: Record<Exclude<Estado, 'activas' | 'inactivas'>, string> = {
    cargando: 'Revisando este dispositivo…',
    'sin-soporte': 'Este navegador no admite notificaciones push. Prueba con Chrome, Edge o Firefox, o instala la app.',
    'ios-instalar': 'En iPhone, primero agrega Numa a tu pantalla de inicio (Compartir › «Agregar a inicio») y ábrela desde ahí. Requiere iOS 16.4 o superior.',
    bloqueadas: 'Bloqueaste las notificaciones de Numa. Actívalas desde los ajustes del navegador o del celular para este sitio.',
  };

  return (
    <div className="push">
      <ul className="rows">
        <li><span className="rows__name">Pagos y transferencias<small>Cuando envías o recibes dinero</small></span></li>
        <li><span className="rows__name">Metas de gasto<small>Al llegar al 80% y al superarlas</small></span></li>
        <li><span className="rows__name">Ofertas<small>Cuando tu ahorro desbloquea un beneficio</small></span></li>
      </ul>

      {estado === 'activas' || estado === 'inactivas' ? (
        <>
          <p className={`push__estado${estado === 'activas' ? ' is-on' : ''}`} role="status">
            {estado === 'activas' ? 'Activadas en este dispositivo' : 'Desactivadas en este dispositivo'}
          </p>
          {estado === 'inactivas' ? (
            <button className="btn" type="button" onClick={activar} disabled={ocupado}>Activar notificaciones</button>
          ) : (
            <div className="form__actions">
              <button className="btn" type="button" onClick={() => probar('recibida', 5)} disabled={ocupado}>
                {esEmpresa ? 'Demo: un cliente te paga en 5 s' : 'Demo: recibir una transferencia en 5 s'}
              </button>
              <button className="btn btn--ghost" type="button" onClick={() => probar('prueba', 0)} disabled={ocupado}>Enviar aviso de prueba</button>
              <button className="btn btn--danger" type="button" onClick={desactivar} disabled={ocupado}>Desactivar</button>
            </div>
          )}
        </>
      ) : (
        <p className="hint" role="status">{textos[estado]}</p>
      )}
      <p className="hint">Las demos usan datos ficticios: no se mueve dinero real.</p>
    </div>
  );
}
