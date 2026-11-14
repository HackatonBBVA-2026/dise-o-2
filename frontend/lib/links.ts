/** Enlace a la pestaña Boot con una pregunta precargada. */
export const preguntarABoot = (q: string) => `/app/boot?q=${encodeURIComponent(q)}`;
