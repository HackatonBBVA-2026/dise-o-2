// Comprueba que el clasificador en TypeScript (frontend/lib/ml/ambito.ts) da lo mismo que scikit-learn.
// Uso (Node 23+, que ejecuta TypeScript directamente):  node ml/verificar_ts.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { probabilidadNegocio } from '../frontend/lib/ml/ambito.ts';

const aqui = (p) => fileURLToPath(new URL(p, import.meta.url));
const modelo = JSON.parse(readFileSync(aqui('../frontend/lib/ml/modelo-ambito.json'), 'utf8'));
const casos = JSON.parse(readFileSync(aqui('./resultados/casos_prueba_ambito.json'), 'utf8'));

let maxDif = 0;
let distintos = 0;
for (const c of casos) {
  const p = probabilidadNegocio(modelo, c);
  const dif = Math.abs(p - c.p_negocio);
  maxDif = Math.max(maxDif, dif);
  if ((p >= 0.5) !== (c.p_negocio >= 0.5)) distintos++;
  if (dif > 1e-3) console.log('DIFIERE', c.descripcion, c.monto, 'python', c.p_negocio, 'ts', p.toFixed(6));
}
console.log(`${casos.length} casos · diferencia máxima ${maxDif.toExponential(2)} · decisiones distintas ${distintos}`);
process.exit(maxDif < 1e-3 && distintos === 0 ? 0 : 1);
