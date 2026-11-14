// Estado en memoria del servidor (demo, sin base de datos).
// Next.js puede cargar un módulo más de una vez (páginas y API por separado), así que el estado
// vive en globalThis: todas las copias del módulo ven y cambian los mismos datos.
// Con el backend, esto se reemplaza por la base de datos.
const g = globalThis as typeof globalThis & { __mio?: Record<string, unknown> };

export function memoria<T>(clave: string, inicial: () => T): T {
  const store = (g.__mio ??= {});
  if (!(clave in store)) store[clave] = inicial();
  return store[clave] as T;
}
