// Service worker de Mío: permite instalar la app en el celular y abrirla sin conexión.
// - Páginas, scripts e íconos: primero la red (datos y código al día); sin conexión, la última versión guardada.
// - /api (Boot, sesión, metas): siempre la red, nunca se guarda.
const VERSION = 'numa-v2'; // súbela cuando cambie este archivo para limpiar cachés viejas

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const SIN_CONEXION = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Numa</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;color:#0B0B0C;background:#fff}p{color:#555}</style></head><body><div><h1>Sin conexión</h1><p>Numa necesita internet para traer tus datos y hablar con Mío. Revisa tu conexión e inténtalo de nuevo.</p></div></body></html>`;

const guardar = (req, res) => {
  if (res.ok && res.type === 'basic') {
    const copia = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copia));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  // Siempre primero la red (así `next dev` nunca sirve código viejo); la caché es solo para sin conexión.
  e.respondWith(
    fetch(req)
      .then((res) => (res.redirected ? res : guardar(req, res)))
      .catch(() =>
        caches.match(req).then((r) => r || (req.mode === 'navigate'
          ? new Response(SIN_CONEXION, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
          : Response.error()))
      )
  );
});

// Notificaciones push: pagos, transferencias recibidas, metas de gasto y ofertas.
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(
    self.registration.showNotification(d.title || 'Numa', {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: d.tag,
      renotify: Boolean(d.tag),
      data: { url: d.url || '/app/avisos' },
    })
  );
});

// Al tocarla, abre (o enfoca) la app en la pantalla del aviso.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL(e.notification.data?.url || '/app', self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) return abierta.focus().then((v) => (v && 'navigate' in v ? v.navigate(destino) : v));
      return self.clients.openWindow(destino);
    })
  );
});
