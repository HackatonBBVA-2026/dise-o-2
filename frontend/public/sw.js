// Service worker de Mío: permite instalar la app en el celular y abrirla sin conexión.
// - Páginas, scripts e íconos: primero la red (datos y código al día); sin conexión, la última versión guardada.
// - /api (Boot, sesión, metas): siempre la red, nunca se guarda.
const VERSION = 'mio-next-v1'; // súbela cuando cambie este archivo para limpiar cachés viejas

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const SIN_CONEXION = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Mío</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px;text-align:center;color:#0B0B0C;background:#fff}p{color:#555}</style></head><body><div><h1>Sin conexión</h1><p>Mío necesita internet para traer tus datos y hablar con Boot. Revisa tu conexión e inténtalo de nuevo.</p></div></body></html>`;

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
