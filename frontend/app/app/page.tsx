import Link from 'next/link';
import { BootAvatar } from '@/components/BootAvatar';
import { Money, PrivacyToggle } from '@/components/Money';
import { IconBuscar, IconChevron, IconDolar, IconLista, IconOjo, IconQR, IconTransferir } from '@/components/icons';
import { tarjeta, usuario } from '@/lib/data';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';
import { preguntarABoot } from '@/lib/links';

export const metadata = { title: 'Inicio' };
export const dynamic = 'force-dynamic'; // el saludo depende de la hora

const COLORES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

const ACCESOS = [
  { href: '/app/operaciones#transferir', label: 'Transferir', Icon: IconTransferir },
  { href: '/app/operaciones#qr', label: 'Pagar QR', Icon: IconQR },
  { href: '/app/operaciones#cambio', label: 'T-Cambio', Icon: IconDolar },
  { href: '/app/operaciones#movimientos', label: 'Movimientos', Icon: IconLista },
];

const PREGUNTAS = [
  { q: '¿Puedo gastar S/ 200 en unas zapatillas?', label: '¿Puedo gastar S/ 200 en unas zapatillas?' },
  { q: '¿Me alcanza para un préstamo de S/ 3,000?', label: '¿Me alcanza para un préstamo de S/ 3,000?' },
  { q: 'Fondo de emergencia', label: '¿Cuánto debería tener de fondo de emergencia?' },
];

export default function InicioPage() {
  const r = getResumen();
  const h = new Date().getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const pos = (d: number) => `${(((d - 1) / (r.cierreMes - 1)) * 100).toFixed(2)}%`;
  const colorCat = (alerta: boolean | undefined, i: number) => (alerta ? 'var(--cat-alerta)' : COLORES[i % COLORES.length]);
  const [entero, decimales] = soles(r.disponible).replace('S/ ', '').split('.');

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

        {/* Saldo: tocar para ocultar */}
        <section className="balance" aria-labelledby="saldoTitle">
          <PrivacyToggle className="balance__toggle">
            <span className="eyebrow" id="saldoTitle">Saldo disponible <IconOjo size={14} /></span>
            <Money className="balance__amount">
              <span className="cur">S/</span>{entero}<span className="dec">.{decimales}</span>
            </Money>
            <span className="sr-only">Toca para ocultar o mostrar tus saldos</span>
          </PrivacyToggle>

          <div className="balance__proj">
            <div>
              <span className="eyebrow">Proyección al {r.cierreMes} nov</span>
              <strong><Money className="gold">{soles(Math.round(r.proyeccion.saldo))}</Money></strong>
            </div>
            <span className={`status status--${r.semaforo.nivel}`}>{r.semaforo.texto}</span>
          </div>

          <div
            className="month"
            role="img"
            aria-label={`Día ${r.hoy} de ${r.cierreMes}. Cobros pendientes los días ${r.proximosCobros.map((c) => c.dia).join(', ')}.`}
          >
            <div className="month__track">
              <span className="month__done" style={{ width: pos(r.hoy) }} />
              {r.proximosCobros.map((c) => (
                <span key={c.nombre} className="month__tick" style={{ left: pos(c.dia) }} title={`${c.nombre} · día ${c.dia}`} />
              ))}
              <span className="month__today" style={{ left: pos(r.hoy) }} />
            </div>
            <div className="month__labels" aria-hidden="true">
              <span style={{ left: 0 }}>01</span>
              <span className="is-today" style={{ left: pos(r.hoy) }}>Hoy</span>
              {r.proximosCobros.map((c) => <span key={c.nombre} style={{ left: pos(c.dia) }}>{c.dia}</span>)}
              <span style={{ left: '100%' }}>{r.cierreMes}</span>
            </div>
          </div>
        </section>

        {/* Accesos rápidos a Operaciones */}
        <nav className="quick span-2" aria-label="Accesos rápidos">
          {ACCESOS.map(({ href, label, Icon }) => (
            <Link key={href} className="quick__item" href={href}>
              <span className="quick__icon"><Icon /></span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Acceso a Avisos (la lista completa vive en su pestaña) */}
        {r.alertas.length > 0 && (
          <Link className="alert-link span-2" href="/app/avisos" data-avisos="">
            <span className="alert-link__mark"><BootAvatar /></span>
            <span className="alert-link__text">
              <strong>Boot encontró {r.alertas.length} aviso{r.alertas.length > 1 ? 's' : ''}</strong>
              <small>{r.alertas.map((a) => a.corto).join(' · ')}</small>
            </span>
            <IconChevron size={18} stroke={1.8} />
          </Link>
        )}

        {/* Flujo del mes */}
        <section className="panel" aria-labelledby="mesTitle">
          <header className="panel__head">
            <h2 id="mesTitle">Noviembre</h2>
            <Link className="link" href="/app/operaciones#movimientos">Movimientos</Link>
          </header>
          <dl className="ledger">
            <div><dt>Ingresos</dt><dd><Money className="pos">+{soles(r.ingresos)}</Money></dd></div>
            <div><dt>Gastos</dt><dd><Money>{soles(-r.gastos)}</Money></dd></div>
            <div className="ledger__total"><dt>Te sobra</dt><dd><Money>{soles(r.neto)}</Money></dd></div>
          </dl>
          <div className="ratio" aria-hidden="true"><span style={{ width: `${r.pctGasto}%` }} /></div>
          <p className="hint">Gastaste {r.pctGasto} de cada 100 soles que ingresaron.</p>
        </section>

        {/* Gasto por categoría */}
        <section className="panel" aria-labelledby="catTitle">
          <header className="panel__head"><h2 id="catTitle">¿En qué se va tu plata?</h2></header>
          <div className="stack" aria-hidden="true">
            {r.categorias.map((c, i) => (
              <span key={c.nombre} style={{ width: `${c.pct}%`, background: colorCat(c.alerta, i) }} />
            ))}
          </div>
          <ul className="legend">
            {r.categorias.map((c, i) => (
              <li key={c.nombre}>
                <span className="swatch" style={{ background: colorCat(c.alerta, i) }} />
                <span className="legend__name">
                  {c.nombre}{c.alerta && <> <em className="tag tag--warn">revisar</em></>}
                </span>
                <span className="legend__pct">{Math.round(c.pct)}%</span>
                <Money>{soles(c.monto)}</Money>
              </li>
            ))}
          </ul>
        </section>

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
        <section className="panel span-2" aria-labelledby="askTitle">
          <header className="panel__head"><h2 id="askTitle">Antes de gastar, pregúntale a Boot</h2></header>
          <p className="hint">Boot hace la cuenta con tus movimientos y te dice cómo quedarías el {r.cierreMes}.</p>
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
