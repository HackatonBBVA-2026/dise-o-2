// Íconos lineales en trazo. Heredan el color con currentColor.
type P = { size?: number; stroke?: number; className?: string };

function Svg({ size = 24, stroke = 1.5, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconMeta = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></Svg>
);
export const IconInicio = (p: P) => (
  <Svg {...p}><path d="M4 10.2 12 4l8 6.2V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></Svg>
);
export const IconTransferir = (p: P) => (
  <Svg {...p}><path d="M5 8h14m0 0-3.5-3.5M19 8l-3.5 3.5M19 16H5m0 0 3.5-3.5M5 16l3.5 3.5" /></Svg>
);
export const IconCelular = (p: P) => (
  <Svg {...p}><rect x="7" y="3" width="10" height="18" rx="2.2" /><path d="M11 17.5h2" /></Svg>
);
export const IconCampana = (p: P) => (
  <Svg {...p}><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10z" /><path d="M10 19.5a2 2 0 0 0 4 0" /></Svg>
);
export const IconPerfil = (p: P) => (
  <Svg {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-3.4 3.4-5.5 7-5.5s6.4 2.1 7 5.5" /></Svg>
);
export const IconQR = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5H14zM20 14v.01M14 20h.01M17 20h3v-3" />
  </Svg>
);
export const IconDolar = (p: P) => (
  <Svg {...p}><path d="M12 4v16M15.5 7.5c0-1.4-1.6-2.5-3.5-2.5s-3.5 1.1-3.5 2.5S10 10 12 10.5s3.5 1.2 3.5 2.8-1.6 2.7-3.5 2.7-3.5-1.1-3.5-2.5" /></Svg>
);
export const IconLista = (p: P) => (
  <Svg {...p}><path d="M5 7h14M5 12h14M5 17h9" /></Svg>
);
export const IconBuscar = (p: P) => (
  <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></Svg>
);
export const IconOjo = (p: P) => (
  <Svg {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></Svg>
);
export const IconChevron = (p: P) => (
  <Svg {...p}><path d="m9 6 6 6-6 6" /></Svg>
);
export const IconFlecha = (p: P) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);
export const IconReloj = (p: P) => (
  <Svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 1.8" /></Svg>
);
export const IconAlerta = (p: P) => (
  <Svg {...p}><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17v.01" /></Svg>
);
export const IconCopia = (p: P) => (
  <Svg {...p}><rect x="4" y="7" width="11" height="13" rx="2" /><path d="M9 4h9a2 2 0 0 1 2 2v11" /></Svg>
);
export const IconEscudo = (p: P) => (
  <Svg {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /></Svg>
);

export const iconoAlerta = { aviso: IconReloj, peligro: IconAlerta, duplicado: IconCopia, seguridad: IconEscudo };
