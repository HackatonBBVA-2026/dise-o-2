'use client';

import Link from 'next/link';
import { BootAvatar } from './BootAvatar';
import { useClasificacion } from './Clasificacion';
import { IconChevron } from './icons';

/** Acceso a Avisos desde Inicio: suma los avisos de Boot y lo que falta clasificar. */
export function AvisosLink({ cortos }: { cortos: string[] }) {
  const { pendientes } = useClasificacion();
  // Lo que falta clasificar va primero: es lo único que el usuario puede resolver con un toque.
  const partes = [...(pendientes.length ? [`${pendientes.length} por clasificar`] : []), ...cortos];
  const total = cortos.length + (pendientes.length ? 1 : 0);
  if (!total) return null;

  return (
    <Link className="alert-link span-2" href="/app/avisos" data-avisos="">
      <span className="alert-link__mark"><BootAvatar /></span>
      <span className="alert-link__text">
        <strong>Boot encontró {total} aviso{total > 1 ? 's' : ''}</strong>
        <small>{partes.join(' · ')}</small>
      </span>
      <IconChevron size={18} stroke={1.8} />
    </Link>
  );
}
