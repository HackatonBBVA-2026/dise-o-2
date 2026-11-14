import '@/styles/device.css';
import { Device } from '@/components/Device';

export const metadata = { title: 'Prototipo móvil' };

/** Vitrina: el teléfono centrado con la app (/app) corriendo dentro. */
export default function VitrinaPage() {
  return (
    <main className="stage">
      <Device />
    </main>
  );
}
