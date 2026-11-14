// Boot como pestaña: cualquier [data-ask] lleva a /app/boot?q=…;
// en esa pantalla se envía la pregunta a /api/boot y se pinta la respuesta.
(function () {
  // En cualquier pantalla: los botones "Revisar" / preguntas abren la pestaña Boot.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]');
    if (!b) return;
    location.href = '/app/boot?q=' + encodeURIComponent(b.dataset.ask);
  });

  const page = document.getElementById('bootPage');
  if (!page) return;

  const log = document.getElementById('bootLog');
  const chips = document.getElementById('bootChips');
  const form = document.getElementById('bootForm');
  const input = document.getElementById('bootInput');

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text; // siempre textContent: sin inyección de HTML
    return n;
  }

  function bajar() { log.scrollTop = log.scrollHeight; }

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
      chips.replaceChildren(...r.chips.map((c) => {
        const b = el('button', 'chip', c);
        b.type = 'button';
        return b;
      }));
    }
  }

  async function enviar(texto) {
    texto = texto.trim();
    if (!texto) return;
    pintarUsuario(texto);
    const typing = el('div', 'msg msg--bot msg--typing', 'Boot está calculando…');
    log.appendChild(typing);
    bajar();
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
    bajar();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar(input.value);
    input.value = '';
  });

  chips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (b) enviar(b.textContent);
  });

  // Mensaje inicial y, si vino una pregunta desde otra pantalla, se envía.
  pintarBot({ texto: ['Hola, soy Boot. Pregúntame antes de gastar y hago la cuenta con tus movimientos.'] });
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    history.replaceState(null, '', location.pathname);
    enviar(q);
  }
})();
