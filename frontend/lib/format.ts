/** soles(1024.5) → "S/ 1,024.50" · soles(-30) → "−S/ 30.00" (signo menos tipográfico) */
export function soles(n: number, decimales = 2): string {
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
  return (n < 0 ? '−' : '') + 'S/ ' + abs;
}

/** Igual que soles(), pero sin decimales cuando el monto es entero (para Boot). */
export function solesCorto(n: number): string {
  return soles(n, Number.isInteger(n) ? 0 : 2);
}

export const r2 = (n: number) => Math.round(n * 100) / 100;
