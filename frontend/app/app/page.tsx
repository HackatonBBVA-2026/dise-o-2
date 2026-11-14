import Link from 'next/link';
import { AvisosLink } from '@/components/AvisosLink';
import { InicioPaneles, InicioSaldo } from '@/components/InicioFinanzas';
import { Money } from '@/components/Money';
import { IconBuscar, IconDolar, IconLista, IconQR, IconTransferir } from '@/components/icons';
import { negocio, tarjeta, usuario } from '@/lib/data';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';
import { preguntarABoot } from '@/lib/links';

export const metadata = { title: 'Inicio' };
export const dynamic = 'force-dynamic'; // el saludo depende de la hora

const ACCESOS = [
  { href: '/app/operaciones#transferir', label: 'Transferir', Icon: IconTransferir },
  { href: '/app/operaciones#qr', label: 'Pagar QR', Icon: IconQR },
  { href: '/app/operaciones#cambio', label: 'T-Cambio', Icon: IconDolar },
  { href: '/app/operaciones#movimientos', label: 'Movimientos', Icon: IconLista },
];

const PREGUNTAS = [
  { q: '¿Puedo gastar S/ 200 en unas zapatillas?', label: '¿Puedo gastar S/ 200 en unas zapatillas?' },
  { q: '¿Cuánto gané este mes en el negocio?', label: '¿Cuánto gané este mes en la bodega?' },
  { q: '¿Puedo reponer stock por S/ 500?', label: '¿Puedo reponer stock por S/ 500?' },
];

export default function InicioPage() {
  const r = getResumen();
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <>
      <header className="topbar">
        <Link className="tier" href="/app/perfil" aria-label={`Ir a tu perfil ${usuario.nivel}`}>
          <span className="avatar avatar--sm">{usuario.nombre[0]}{usuario.apellido[0]}</span>
          <span className="tier__text">
            <span className="eyebrow">{usuario.nivel}</span>
            <span className="tier__hello">{saludo}, {usuario.nombre}</span>
          </span>
        </Link>
        <Link className="icon-btn" href="/app/operaciones#movimientos" aria-label="Buscar movimientos">
          <IconBuscar size={20} stroke={1.6} />
        </Link>
      </header>

      <div className="grid">
        {/* Tarjeta virtual */}
        <figure className="card-v" aria-label={`Tarjeta de ${tarjeta.tipo.toLowerCase()} terminada en ${tarjeta.ultimos}`}>
          <div className="card-v__top">
            <span className="card-v__brand">BOOT</span>
            <span className="card-v__tier">BLACK<small>{tarjeta.tipo.toUpperCase()}</small></span>
          </div>
          <div className="card-v__mid" aria-hidden="true">
            <svg className="card-v__chip" viewBox="0 0 44 34">
              <rect x=".75" y=".75" width="42.5" height="32.5" rx="6" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <path d="M15 1v9.5H1M15 33v-9.5H1M29 1v9.5h14M29 33v-9.5h14M15 10.5h14v13H15z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <svg className="card-v__nfc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M8 8.5a5 5 0 0 1 0 7M11.5 6a8.5 8.5 0 0 1 0 12M15 3.5a12 12 0 0 1 0 17" />
            </svg>
          </div>
          <p className="card-v__number emboss">•••• •••• •••• {tarjeta.ultimos}</p>
          <div className="card-v__bottom">
            <span><small>Titular</small><b className="emboss">{tarjeta.titular}</b></span>
            <span><small>Vence</small><b className="emboss">{tarjeta.vence}</b></span>
          </div>
        </figure>

        {/* Selector Personal · Negocio · Todo + saldo y proyección */}
        <InicioSaldo
          disponible={r.disponible}
          hoy={r.hoy}
          cierreMes={r.cierreMes}
          proximosCobros={r.proximosCobros}
          nombreNegocio={negocio.nombre}
        />

        {/* Accesos rápidos a Operaciones */}
        <nav className="quick span-2" aria-label="Accesos rápidos">
          {ACCESOS.map(({ href, label, Icon }) => (
            <Link key={href} className="quick__item" href={href}>
              <span className="quick__icon"><Icon /></span>
              {label}
            </Link>
          ))}
        </nav>

        <AvisosLink cortos={r.alertas.map((a) => a.corto)} />

        {/* Resumen del mes y categorías según la vista */}
        <InicioPaneles nombreNegocio={negocio.nombre} />

        {/* Próximos cobros + cuentas */}
        <section className="panel" aria-labelledby="cobrosTitle">
          <header className="panel__head">
            <h2 id="cobrosTitle">Próximos cobros</h2>
            <Money className="count">{soles(-r.proyeccion.pendientes)}</Money>
          </header>
          <ul className="rows">
            {r.proximosCobros.map((c) => (
              <li key={c.nombre}>
                <span className="date"><b>{c.dia}</b>nov</span>
                <span className="rows__name">{c.nombre}</span>
                <Money>{soles(-c.monto)}</Money>
              </li>
            ))}
          </ul>
          <header className="panel__head panel__head--sub"><h2>Cuentas</h2></header>
          <ul className="rows">
            {r.cuentas.map((c) => (
              <li key={c.id}>
                <span className="rows__name">{c.tipo}<small>•••• {c.numero}</small></span>
                <Money>{soles(c.saldo)}</Money>
              </li>
            ))}
          </ul>
        </section>

        {/* Acceso directo a Boot */}
        <section className="panel" aria-labelledby="askTitle">
          <header className="panel__head"><h2 id="askTitle">Antes de gastar, pregúntale a Boot</h2></header>
          <p className="hint">Boot hace la cuenta con tus movimientos y separa lo personal de lo del negocio.</p>
          <div className="asks">
            {PREGUNTAS.map((p) => (
              <Link key={p.q} className="ask" href={preguntarABoot(p.q)}>{p.label}</Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
