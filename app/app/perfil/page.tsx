import Link from 'next/link';
import { Ajustes } from '@/components/Ajustes';
import { IconChevron } from '@/components/icons';
import { usuario } from '@/lib/data';

export const metadata = { title: 'Perfil' };

function Fila({ children, demo, href }: { children: React.ReactNode; demo?: string; href?: string }) {
  const contenido = <>{children}<IconChevron size={16} stroke={1.8} /></>;
  return (
    <li>
      {href ? (
        <Link className="row-btn" href={href}>{contenido}</Link>
      ) : (
        <button type="button" className="row-btn" data-demo={demo}>{contenido}</button>
      )}
    </li>
  );
}

export default function PerfilPage() {
  return (
    <>
      <header className="pagehead pagehead--profile">
        <span className="avatar" aria-hidden="true">{usuario.nombre[0]}{usuario.apellido[0]}</span>
        <div>
          <p className="pagehead__eyebrow"><span className="gold">{usuario.nivel}</span> · Cliente desde {usuario.clienteDesde}</p>
          <h1>{usuario.nombre} {usuario.apellido}</h1>
        </div>
      </header>

      <div className="grid">
        <section className="panel" aria-labelledby="cuentaTitle">
          <header className="panel__head"><h2 id="cuentaTitle">Mi cuenta</h2></header>
          <ul className="rows">
            <li><span className="rows__name">Correo</span><span className="muted">{usuario.email}</span></li>
            <li><span className="rows__name">Celular</span><span className="muted mono">{usuario.telefono}</span></li>
            <Fila demo="Editar datos personales">Datos personales</Fila>
          </ul>
        </section>

        <section className="panel" aria-labelledby="ajustesTitle">
          <header className="panel__head"><h2 id="ajustesTitle">Ajustes</h2></header>
          <Ajustes />
        </section>

        <section className="panel" aria-labelledby="segTitle">
          <header className="panel__head"><h2 id="segTitle">Seguridad</h2></header>
          <ul className="rows">
            <Fila demo="Cambiar clave">Cambiar clave de internet</Fila>
            <Fila demo="Dispositivos vinculados">Dispositivos vinculados</Fila>
            <Fila demo="Límites de operaciones">Límites de operaciones</Fila>
          </ul>
        </section>

        <section className="panel" aria-labelledby="ayudaTitle">
          <header className="panel__head"><h2 id="ayudaTitle">Ayuda</h2></header>
          <ul className="rows">
            <Fila href="/app/boot">Escribirle a Boot</Fila>
            <Fila demo="Centro de ayuda">Centro de ayuda</Fila>
            <li>
              <span className="rows__name">Banca por teléfono<small>Lunes a domingo, 24 horas</small></span>
              <span className="mono">(01) 555-0100</span>
            </li>
            <Fila demo="Reportar un problema">Reportar un problema</Fila>
          </ul>
        </section>

        <div className="span-2 signout">
          <button type="button" className="btn btn--danger" data-demo="Cerrar sesión">Cerrar sesión</button>
          <p className="hint">Concepto para discusión. Datos ficticios, no es un producto oficial. v2.0</p>
        </div>
      </div>
    </>
  );
}
