// Pestaña Operaciones: paneles, filtro de movimientos, transferencia y tipo de cambio.
(function () {
  /* ---- Paneles (con soporte de #hash, p. ej. /operaciones#transferir) ---- */
  const tabs = [...document.querySelectorAll('[data-panel]')];
  function mostrar(id) {
    if (!document.getElementById(id)) id = 'movimientos';
    tabs.forEach((t) => {
      const activo = t.dataset.panel === id;
      t.setAttribute('aria-selected', activo);
      t.tabIndex = activo ? 0 : -1;
      document.getElementById(t.dataset.panel).hidden = !activo;
    });
  }
  tabs.forEach((t) =>
    t.addEventListener('click', () => {
      history.replaceState(null, '', '#' + t.dataset.panel);
      mostrar(t.dataset.panel);
    })
  );
  mostrar(location.hash.slice(1));
  window.addEventListener('hashchange', () => mostrar(location.hash.slice(1)));

  /* ---- Movimientos: búsqueda + filtro ---- */
  const buscar = document.getElementById('buscarMov');
  const items = [...document.querySelectorAll('.mov')];
  const vacio = document.getElementById('movVacio');
  let filtro = 'todos';
  function filtrar() {
    const q = buscar.value.trim().toLowerCase();
    let visibles = 0;
    items.forEach((li) => {
      const ok = (filtro === 'todos' || li.dataset.tipo === filtro) && li.dataset.texto.includes(q);
      li.hidden = !ok;
      if (ok) visibles++;
    });
    vacio.hidden = visibles > 0;
  }
  buscar.addEventListener('input', filtrar);
  document.querySelectorAll('[data-filtro]').forEach((b) =>
    b.addEventListener('click', () => {
      filtro = b.dataset.filtro;
      document.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('is-active', x === b));
      filtrar();
    })
  );

  /* ---- Transferir ---- */
  const form = document.getElementById('formTransfer');
  const err = document.getElementById('transferError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch('/api/transferencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      err.textContent = data.error;
      err.hidden = false;
      return;
    }
    form.reset();
    toast(`${data.mensaje} Código ${data.codigo}.`);
  });

  // Antes de transferir, Boot simula si alcanza
  form.querySelector('[data-ask-monto]').addEventListener('click', () => {
    const monto = Number(form.monto.value) || 200;
    location.href = "/app/boot?q=" + encodeURIComponent(`¿Me alcanza si gasto S/ ${monto}?`);
  });

  /* ---- Tipo de cambio ---- */
  const fx = document.getElementById('formCambio');
  const fxIn = document.getElementById('fxIn');
  const fxOut = document.getElementById('fxOut');
  const fxLabel = document.getElementById('fxLabelIn');
  const compra = Number(fx.dataset.compra);
  const venta = Number(fx.dataset.venta);
  let modo = 'comprar';
  function calcular() {
    const v = Number(fxIn.value) || 0;
    // Comprar dólares: pagas soles al precio de venta del banco. Vender dólares: recibes soles al de compra.
    fxOut.textContent = modo === 'comprar' ? `US$ ${(v / venta).toFixed(2)}` : `S/ ${(v * compra).toFixed(2)}`;
    fxLabel.textContent = modo === 'comprar' ? 'Envías (S/)' : 'Envías (US$)';
  }
  fx.querySelectorAll('[data-modo]').forEach((b) =>
    b.addEventListener('click', () => {
      modo = b.dataset.modo;
      fx.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('is-active', x === b));
      calcular();
    })
  );
  fxIn.addEventListener('input', calcular);
  calcular();
})();
