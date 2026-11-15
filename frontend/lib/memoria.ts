// Estado de la demo (sin base de datos propia).
// Next.js puede cargar un módulo más de una vez (páginas y API por separado), así que el estado
// vive en globalThis: todas las copias del módulo ven y cambian los mismos datos.
// En Vercel, lib/estado.ts lo carga desde Redis al empezar cada petición y lo guarda al cambiar algo.
type Store = Record<string, unknown>;
const g = globalThis as typeof globalThis & { __mio?: Store; __mioInicial?: Record<string, () => unknown> };

export function memoria<T>(clave: string, inicial: () => T): T {
  const store = (g.__mio ??= {});
  (g.__mioInicial ??= {})[clave] = inicial;
  if (!(clave in store)) store[clave] = inicial();
  return store[clave] as T;
}

/** Copia serializable de todo el estado (para guardarlo). */
export function exportarMemoria(): Store {
  return JSON.parse(JSON.stringify(g.__mio ?? {}));
}

/** Reemplaza el contenido SIN cambiar las referencias: los módulos que ya leyeron un valor ven el nuevo. */
function reemplazar(store: Store, clave: string, valor: unknown) {
  const actual = store[clave];
  if (Array.isArray(actual) && Array.isArray(valor)) actual.splice(0, actual.length, ...valor);
  else if (actual && valor && typeof actual === 'object' && typeof valor === 'object' && !Array.isArray(actual)) {
    for (const k of Object.keys(actual)) delete (actual as Store)[k];
    Object.assign(actual, valor);
  } else store[clave] = valor;
}

export function importarMemoria(datos: Store) {
  const store = (g.__mio ??= {});
  for (const [clave, valor] of Object.entries(datos)) reemplazar(store, clave, valor);
}

/** Vuelve todo a los datos iniciales de la demo. */
export function reiniciarMemoria() {
  const store = (g.__mio ??= {});
  for (const [clave, inicial] of Object.entries(g.__mioInicial ?? {})) reemplazar(store, clave, inicial());
}
