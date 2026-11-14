import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Boot', template: '%s · Boot' },
  description: 'Concepto de app de finanzas personales con asistente de IA. Datos ficticios.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFFFFF',
};

// Marca el documento cuando la app corre dentro del modelo de teléfono (iframe de la vitrina),
// antes de pintar, para reservar el espacio del indicador de inicio sin parpadeo.
const enDispositivo = `if (window.self !== window.top) document.documentElement.classList.add('in-device');`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: enDispositivo }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
