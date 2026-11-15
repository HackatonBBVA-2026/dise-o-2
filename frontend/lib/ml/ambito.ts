// Clasificador de ámbito (negocio / personal) entrenado en ml/ con scikit-learn y exportado a JSON (ml/exportar.py).
// Aquí se repite el mismo preprocesamiento para ejecutarlo dentro de la app, sin Python:
//   TF-IDF de caracteres (char_wb 2-5, tf sublineal) + TF-IDF de palabras + log(1+|monto|), es_ingreso
//   + one-hot (medio, día de la semana, tramo del mes, perfil, rubro) → regresión logística.
// Archivo puro (sin dependencias de Node ni de Next): ml/verificar_ts.mjs lo compara contra Python.

export interface Vectorizador {
  analizador: 'char_wb' | 'word';
  ngramas: [number, number];
  minusculas: boolean;
  patron: string | null;
  tf_sublineal: boolean;
  terminos: string[];
  idf: number[];
}

export interface ModeloAmbito {
  version: number;
  umbral: number;
  clases: string[]; // ['negocio', 'personal']
  chars: Vectorizador;
  palabras: Vectorizador;
  numericas: string[];
  categoricas: Record<'medio' | 'dia_semana' | 'tramo_mes' | 'perfil' | 'rubro', string[]>;
  coef: number[];
  intercepto: number;
}

export interface EntradaAmbito {
  /** Texto del movimiento tal como lo trae el banco (p. ej. "PAGO QR DE ROSA P"). */
  descripcion: string;
  monto: number;
  medio: string;
  /** Fecha AAAA-MM-DD. */
  fecha: string;
  perfil: string;
  rubro: string;
}

/** Igual que sklearn `_char_wb_ngrams`: n-gramas dentro de cada palabra, con espacios en los bordes. */
function ngramasCharWb(texto: string, min: number, max: number) {
  const out: string[] = [];
  for (const palabra of texto.replace(/\s\s+/g, ' ').split(/\s+/).filter(Boolean)) {
    const w = Array.from(` ${palabra} `);
    for (let n = min; n <= max; n++) {
      let offset = 0;
      out.push(w.slice(offset, offset + n).join(''));
      while (offset + n < w.length) {
        offset++;
        out.push(w.slice(offset, offset + n).join(''));
      }
      if (offset === 0) break; // palabra más corta que n: se cuenta una sola vez
    }
  }
  return out;
}

const indices = new WeakMap<Vectorizador, Map<string, number>>();
function indice(v: Vectorizador) {
  let m = indices.get(v);
  if (!m) indices.set(v, (m = new Map(v.terminos.map((t, i) => [t, i]))));
  return m;
}

/** TF-IDF con normalización L2, devuelto como pares (posición, valor). */
function tfidf(v: Vectorizador, texto: string): [number, number][] {
  const doc = v.minusculas ? texto.toLowerCase() : texto;
  const tokens = v.analizador === 'char_wb' ? ngramasCharWb(doc, v.ngramas[0], v.ngramas[1]) : doc.match(new RegExp(v.patron ?? '\\w\\w+', 'g')) ?? [];
  const idx = indice(v);
  const cuenta = new Map<number, number>();
  for (const t of tokens) {
    const i = idx.get(t);
    if (i !== undefined) cuenta.set(i, (cuenta.get(i) ?? 0) + 1);
  }
  const pares: [number, number][] = [...cuenta].map(([i, tf]) => [i, (v.tf_sublineal ? 1 + Math.log(tf) : tf) * v.idf[i]]);
  const norma = Math.sqrt(pares.reduce((a, [, x]) => a + x * x, 0)) || 1;
  return pares.map(([i, x]) => [i, x / norma]);
}

const tramoMes = (dia: number) => (dia <= 5 ? '1-5' : dia <= 10 ? '6-10' : dia <= 20 ? '11-20' : dia <= 25 ? '21-25' : '26-31');

/** Probabilidad de que el movimiento sea del NEGOCIO (0 a 1). */
export function probabilidadNegocio(modelo: ModeloAmbito, e: EntradaAmbito): number {
  let z = modelo.intercepto;
  let base = 0;
  for (const [i, x] of tfidf(modelo.chars, e.descripcion)) z += modelo.coef[base + i] * x;
  base += modelo.chars.terminos.length;
  for (const [i, x] of tfidf(modelo.palabras, e.descripcion)) z += modelo.coef[base + i] * x;
  base += modelo.palabras.terminos.length;

  z += modelo.coef[base] * Math.log1p(Math.abs(e.monto));
  z += modelo.coef[base + 1] * (e.monto > 0 ? 1 : 0);
  base += 2;

  const [a, m, d] = e.fecha.split('-').map(Number);
  const diaSemana = String((new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7); // lunes = 0, como pandas
  const valores: Record<keyof ModeloAmbito['categoricas'], string> = {
    medio: e.medio,
    dia_semana: diaSemana,
    tramo_mes: tramoMes(d),
    perfil: e.perfil,
    rubro: e.rubro,
  };
  for (const col of ['medio', 'dia_semana', 'tramo_mes', 'perfil', 'rubro'] as const) {
    const cats = modelo.categoricas[col];
    const i = cats.indexOf(valores[col]);
    if (i >= 0) z += modelo.coef[base + i]; // categoría desconocida: todo en cero (handle_unknown="ignore")
    base += cats.length;
  }

  // La regresión logística binaria modela la segunda clase ("personal").
  const pSegunda = 1 / (1 + Math.exp(-z));
  return modelo.clases[1] === 'negocio' ? pSegunda : 1 - pSegunda;
}
