// Chat de Boot: abre la hoja, envía preguntas a /api/boot y pinta la respuesta.
(function () {
  const fab = document.getElementById('bootFab');
  const sheet = document.getElementById('bootSheet');
  const log = document.getElementById('bootLog');
  const chips = document.getElementById('bootChips');
  const form = document.getElementById('bootForm');
  const input = document.getElementById('bootInput');
  const greeting = document.getElementById('bootGreeting');
  const scrim = document.getElementById('bootScrim');
  scrim.addEventListener('click', () => cerrar());
  let ultimoFoco = null;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text; // siempre textContent: sin inyección de HTML
    return n;
  }

  function abrir(pregunta) {
    ultimoFoco = document.activeElement;
    sheet.hidden = false;
    scrim.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (greeting) greeting.remove();
    const badge = fab.querySelector('.boot-fab__badge');
    if (badge) badge.remove();
    fab.removeAttribute('data-ask');

    if (!log.children.length && !pregunta) {
      pintarBot({ texto: ['Hola, soy Boot. Pregúntame antes de gastar y hago la cuenta con tus movimientos.'] });
    }
    if (pregunta) enviar(pregunta);
    else input.focus();
  }

  function cerrar() {
    sheet.hidden = true;
    scrim.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }

  function pintarUsuario(texto) {
    log.appendChild(el('div', 'msg msg--user', texto));
  }

  function pintarBot(r) {
    const m = el('div', 'msg msg--bot');
    (r.texto || []).forEach((t) => m.appendChild(el('p', null, t)));
    if (r.lista) {
      const ol = el('ol');
      r.lista.forEach((t) => ol.appendChild(el('li', null, t)));
      m.appendChild(ol);
    }
    if (r.tabla) {
      const table = el('table');
      r.tabla.forEach((f) => {
        const tr = el('tr');
        tr.appendChild(el('td', null, f.label));
        tr.appendChild(el('td', f.tono ? 't-' + f.tono : null, f.valor));
        table.appendChild(tr);
      });
      m.appendChild(table);
    }
    if (r.nota) m.appendChild(el('p', null, r.nota));
    log.appendChild(m);

    if (r.chips) {
      chips.replaceChildren(...r.chips.map((c) => el('button', 'chip', c)));
      chips.querySelectorAll('button').forEach((b) => (b.type = 'button'));
    }
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto) return;
    pintarUsuario(texto);
    const typing = el('div', 'msg msg--bot msg--typing', 'Boot está calculando…');
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;
    try {
      const res = await fetch('/api/boot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto }),
      });
      const data = await res.json();
      typing.remove();
      pintarBot(data);
    } catch {
      typing.remove();
      pintarBot({ texto: ['No pude conectarme. Inténtalo de nuevo en un momento.'] });
    }
    log.scrollTop = log.scrollHeight;
  }

  // Eventos
  fab.addEventListener('click', () => abrir(fab.dataset.ask));
  sheet.querySelector('[data-close-boot]').addEventListener('click', cerrar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) cerrar(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar(input.value);
    input.value = '';
  });

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) enviar(b.textContent);
  });

  // Cualquier botón con data-ask en la página abre Boot con esa pregunta
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (b && b !== fab) abrir(b.dataset.ask);
    if (e.target.closest('[data-close-greeting]') && greeting) greeting.remove();
  });

  window.Boot = { abrir };
})();
