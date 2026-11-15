// Notificaciones push (Web Push con claves VAPID). SOLO SERVIDOR: no importar desde componentes cliente.
// Las suscripciones viven en memoria (demo): el navegador las vuelve a registrar al abrir la app.
import webpush, { type PushSubscription } from 'web-push';
import { memoria } from './memoria';
import type { Perfil } from './sesion';

export interface AvisoPush {
  title: string;
  body: string;
  /** Pantalla que se abre al tocar la notificación. */
  url?: string;
  /** Mismo tag = reemplaza la notificación anterior en vez de apilarla. */
  tag?: string;
}

const subs = memoria<Record<Perfil, PushSubscription[]>>('pushSubs', () => ({ persona: [], empresa: [] }));

export const clavePublica = () => process.env.VAPID_PUBLIC_KEY ?? '';
export const pushDisponible = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

let configurado = false;
function configurar() {
  if (configurado || !pushDisponible()) return configurado;
  // Apple rechaza (BadJwtToken) contactos con dominios reservados como .example o localhost: usar un https:// o mailto: real.
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://github.com/HackatonBBVA-2026/dise-o-2',process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  return (configurado = true);
}

const valida = (s: unknown): s is PushSubscription => {
  const x = s as PushSubscription;
  return Boolean(x && typeof x.endpoint === 'string' && x.endpoint.startsWith('https://') && x.keys?.p256dh && x.keys?.auth);
};

export function suscribir(perfil: Perfil, s: unknown) {
  if (!valida(s)) return false;
  // Un celular recibe los avisos del perfil con el que entró la última vez.
  for (const p of Object.keys(subs) as Perfil[]) subs[p] = subs[p].filter((x) => x.endpoint !== s.endpoint);
  subs[perfil].push({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } });
  return true;
}

export function desuscribir(endpoint: unknown) {
  for (const p of Object.keys(subs) as Perfil[]) subs[p] = subs[p].filter((x) => x.endpoint !== endpoint);
}

export const suscritos = (perfil: Perfil) => subs[perfil].length;

/** Envía el aviso a todos los dispositivos suscritos del perfil. Nunca lanza: si falla, la app sigue igual. */
export async function enviarPush(perfil: Perfil, aviso: AvisoPush) {
  if (!configurar() || !subs[perfil].length) return 0;
  const payload = JSON.stringify({ url: '/app/avisos', ...aviso });
  let enviados = 0;
  await Promise.all(
    subs[perfil].map(async (s) => {
      try {
        await webpush.sendNotification(s, payload, { TTL: 300, urgency: 'high' });
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) desuscribir(s.endpoint); // el navegador ya la dio de baja
        else console.warn('[push] no se pudo enviar:', code ?? (e as Error).message, new URL(s.endpoint).host, String((e as { body?: string }).body ?? '').slice(0, 300));
      }
    })
  );
  return enviados;
}
