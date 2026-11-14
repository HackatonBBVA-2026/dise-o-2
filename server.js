const path = require('path');
const express = require('express');
const { getResumen, validarTransferencia } = require('./src/finanzas');
const { responder } = require('./src/boot');
const data = require('./src/data');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Helper disponible en todas las vistas: soles(1024.5) -> "S/ 1,024.50"
app.locals.soles = (n) => {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '- ' : '') + 'S/ ' + abs;
};

/* ---------- Vitrina: modelo de teléfono con la app dentro ---------- */
app.get('/', (req, res) => {
  res.render('dispositivo');
});

/* ---------- App: pestañas (exactamente 3) ---------- */
app.get('/app', (req, res) => {
  res.render('inicio', { tab: 'inicio', titulo: 'Inicio', r: getResumen(), usuario: data.usuario });
});

app.get('/app/operaciones', (req, res) => {
  res.render('operaciones', {
    tab: 'operaciones',
    titulo: 'Operaciones',
    r: getResumen(),
    cuentas: data.cuentas,
    tipoCambio: data.tipoCambio,
  });
});

app.get('/app/perfil', (req, res) => {
  res.render('perfil', { tab: 'perfil', titulo: 'Perfil', usuario: data.usuario });
});

/* ---------- API ---------- */
// Boot: el código calcula, la "IA" solo explica.
app.post('/api/boot', (req, res) => {
  const mensaje = String(req.body?.mensaje || '').slice(0, 300);
  res.json(responder(mensaje));
});

// Transferencia de demostración (no mueve dinero ni persiste nada).
app.post('/api/transferencias', (req, res) => {
  const resultado = validarTransferencia(req.body || {});
  res.status(resultado.ok ? 200 : 400).json(resultado);
});

app.use((req, res) => res.status(404).redirect('/'));

app.listen(PORT, () => {
  console.log(`Boot listo en http://localhost:${PORT}`);
});
