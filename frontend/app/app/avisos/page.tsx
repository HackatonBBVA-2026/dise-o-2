import Link from 'next/link';
import { BandejaClasificar } from '@/components/BandejaClasificar';
import { Money } from '@/components/Money';
import { iconoAlerta } from '@/components/icons';
import { seguridad } from '@/lib/data';
import { getResumen } from '@/lib/finanzas';
import { soles } from '@/lib/format';
import { preguntarABoot } from '@/lib/links';
import { sesionActual } from '@/lib/sesion-servidor';
import { alertasDe } from '@/lib/alertas';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Avisos' };

export default async function AvisosPage() {
  const { perfil } = await sesionActual();
  const r = { ...getResumen(), alertas: alertasDe(perfil) };
  const Escudo = iconoAlerta.seguridad;

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">Noviembre</p>
          <h1>Avisos</h1>
        </div>
      </header>

      <div className="grid">
        {perfil === 'empresa' && <BandejaClasificar />}

        <section className="panel" aria-labelledby="bootAvisos" data-avisos="">
          <header className="panel__head">
            <h2 id="bootAvisos">Mío revisó tu mes</h2>
            <span className="count">Nuevo</span>
          </header>
          <ul className="notices">
            {r.alertas.map((a) => {
              const Icon = iconoAlerta[a.tipo];
              return (
                <li key={a.titulo} className={`notice notice--${a.tipo}`}>
                  <span className="notice__icon"><Icon size={18} /></span>
                  <div className="notice__body">
                    <strong>{a.titulo}</strong>
                    <p>{a.texto}</p>
                  </div>
                  <Link className="btn-sm" href={preguntarABoot(a.pregunta)}>Revisar</Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" aria-labelledby="cobrosTitle">
          <header className="panel__head">
            <h2 id="cobrosTitle">Próximos cobros</h2>
            <Money className="count">{soles(-r.proyeccion.pendientes)}</Money>
          </header>
          <ul className="rows">
            {r.proximosCobros.map((c) => (
              <li key={c.nombre}>
                <span className="date"><b>{c.dia}</b>nov</span>
                <span className="rows__name">{c.nombre}<small>En {c.dia - r.hoy} días</small></span>
                <Money>{soles(-c.monto)}</Money>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="segTitle">
          <header className="panel__head"><h2 id="segTitle">Seguridad</h2></header>
          <ul className="notices">
            {seguridad.map((s) => (
              <li key={s.titulo} className="notice notice--seguridad">
                <span className="notice__icon"><Escudo size={18} /></span>
                <div className="notice__body">
                  <strong>{s.titulo}</strong>
                  <p>{s.detalle} · {s.cuando}</p>
                </div>
                <button type="button" className="btn-sm" data-demo="¿No fuiste tú? Bloquear acceso">¿No fuiste tú?</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
