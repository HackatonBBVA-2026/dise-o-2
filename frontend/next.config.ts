import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sin el botón flotante de Next.js en desarrollo (limpia las capturas y la demo en vivo).
  devIndicators: false,
  // Permite probar `next dev` desde el celular por un túnel de Cloudflare (trycloudflare.com).
  allowedDevOrigins: ['*.trycloudflare.com'],
  // La vitrina (/) carga la app (/app) en un iframe del mismo origen.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }];
  },
};

export default nextConfig;
