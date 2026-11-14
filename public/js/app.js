// Utilidades globales: preferencias, toast y botones de demostración.
(function () {
  const PREFS_KEY = 'boot.prefs';

  function leerPrefs() {
    try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
  }
  function guardarPrefs(p) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* modo privado */ }
  }

  // Modo privado: reemplaza cada monto por puntos y lo restaura al volver a tocar.
  function enmascarar(ocultar) {
    document.querySelectorAll('.money').forEach((el) => {
      if (ocultar && el.dataset.v === undefined) {
        el.dataset.v = el.innerHTML;
        el.textContent = 'S/ ••••••';
      } else if (!ocultar && el.dataset.v !== undefined) {
        el.innerHTML = el.dataset.v;
        delete el.dataset.v;
      }
    });
    document.querySelectorAll('[data-toggle-saldos]').forEach((b) => b.setAttribute('aria-pressed', String(ocultar)));
  }

  function aplicarPrefs(p) {
    document.body.classList.toggle('ocultar-saldos', !!p.ocultarSaldos);
    document.body.classList.toggle('sin-avisos', p.avisosBoot === false);
    enmascarar(!!p.ocultarSaldos);
  }

  const prefs = leerPrefs();
  aplicarPrefs(prefs);

  // Switches del Perfil
  document.querySelectorAll('[data-pref]').forEach((input) => {
    const k = input.dataset.pref;
    if (k in prefs) input.checked = !!prefs[k];
    input.addEventListener('change', () => {
      prefs[k] = input.checked;
      guardarPrefs(prefs);
      aplicarPrefs(prefs);
    });
  });

  // Ojo de Inicio: mostrar/ocultar saldos
  document.querySelectorAll('[data-toggle-saldos]').forEach((btn) =>
    btn.addEventListener('click', () => {
      prefs.ocultarSaldos = !prefs.ocultarSaldos;
      guardarPrefs(prefs);
      aplicarPrefs(prefs);
    })
  );

  // Toast
  const toastEl = document.getElementById('toast');
  let timer;
  window.toast = function (msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(timer);
    timer = setTimeout(() => (toastEl.hidden = true), 2800);
  };

  document.addEventListener('click', (e) => {
    const demo = e.target.closest('[data-demo]');
    if (demo) toast(`Demo: "${demo.dataset.demo}" estaría disponible en la versión oficial.`);
  });
})();
