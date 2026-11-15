'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BootAvatar } from './BootAvatar';
import { useClasificacion } from './Clasificacion';
import { IconCampana, IconInicio, IconLista, IconPerfil } from './icons';

const TABS = [
  { href: '/app', label: 'Inicio', Icon: IconInicio },
  { href: '/app/movimientos', label: 'Movimientos', Icon: IconLista },
  { href: '/app/boot', label: 'Mío', centro: true },
  { href: '/app/avisos', label: 'Avisos', Icon: IconCampana, punto: true },
  { href: '/app/perfil', label: 'Perfil', Icon: IconPerfil },
] as const;

/** Barra inferior: 5 pestañas, Boot al centro y elevado. */
export function Nav({ alertasCount }: { alertasCount: number }) {
  const pathname = usePathname();
  const { pendientes, perfil } = useClasificacion();
  // Avisos de Boot + un aviso más si hay movimientos por clasificar (solo con RUC).
  const avisosCount = alertasCount + (perfil === 'empresa' && pendientes.length ? 1 : 0);

  return (
    <nav className="nav" aria-label="Navegación principal">
      {TABS.map((t) => {
        const activa = pathname === t.href;
        const conPunto = 'punto' in t && avisosCount > 0;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`nav__item${'centro' in t ? ' nav__item--boot' : ''}${activa ? ' is-active' : ''}`}
            aria-current={activa ? 'page' : undefined}
          >
            <span className="nav__icon">
              {'centro' in t ? (
                <span className="nav__boot"><BootAvatar /></span>
              ) : (
                <>
                  <t.Icon stroke={activa ? 2 : 1.5} />
                  {conPunto && <span className="nav__dot" aria-hidden="true" />}
                </>
              )}
            </span>
            <span className="nav__label">
              {t.label}
              {conPunto && <span className="sr-only"> ({avisosCount} nuevos)</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
