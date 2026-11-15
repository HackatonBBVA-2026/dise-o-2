import '@/styles/device.css';
import { Device } from '@/components/Device';

export const metadata = { title: 'Prototipo móvil' };

/** Vitrina opcional (/vitrina): el teléfono centrado con la app corriendo dentro, para mostrarla en una pantalla grande. */
export default function VitrinaPage() {
  return (
    <main className="stage">
      <Device />
    </main>
  );
}
