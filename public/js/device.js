// Vitrina del teléfono: escala para caber en la ventana y reloj de la barra de estado.
(function () {
  const slot = document.getElementById('deviceSlot');
  const device = document.getElementById('device');
  const clock = document.getElementById('clock');

  function escalar() {
    const w = device.offsetWidth;
    const h = device.offsetHeight;
    const s = Math.min(1, (window.innerHeight - 48) / h, (window.innerWidth - 48) / w);
    device.style.setProperty('--s', s.toFixed(4));
    slot.style.width = w * s + 'px';
    slot.style.height = h * s + 'px';
  }
  window.addEventListener('resize', escalar);
  escalar();

  function tic() {
    const d = new Date();
    clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tic();
  setInterval(tic, 15000);
})();
