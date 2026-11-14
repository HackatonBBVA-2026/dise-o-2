'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BootAvatar } from './BootAvatar';
import { IconCampana, IconInicio, IconPerfil, IconTransferir } from './icons';

const TABS = [
  { href: '/app', label: 'Inicio', Icon: IconInicio },
  { href: '/app/operaciones', label: 'Operaciones', Icon: IconTransferir },
  { href: '/app/boot', label: 'Boot', centro: true },
  { href: '/app/avisos', label: 'Avisos', Icon: IconCampana, punto: true },
  { href: '/app/perfil', label: 'Perfil', Icon: IconPerfil },
] as const;

/** Barra inferior: 5 pestañas, Boot al centro y elevado. */
export function Nav({ avisosCount }: { avisosCount: number }) {
  const pathname = usePathname();

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
