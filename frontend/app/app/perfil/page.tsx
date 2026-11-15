import Link from 'next/link';
import { Ajustes } from '@/components/Ajustes';
import { CerrarSesion } from '@/components/CerrarSesion';
import { EnviarReporte } from '@/components/EnviarReporte';
import { ReglasNegocio } from '@/components/ReglasNegocio';
import { IconChevron } from '@/components/icons';
import { negocio, usuario } from '@/lib/data';
import { sesionActual } from '@/lib/sesion-servidor';

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

export default async function PerfilPage() {
  const sesion = await sesionActual();
  const esEmpresa = sesion.perfil === 'empresa';
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
            <li>
              <span className="rows__name">Ingresaste con<small>{esEmpresa ? 'Perfil emprendedor o empresa' : 'Perfil persona'}</small></span>
              <span className="muted mono">{esEmpresa ? 'RUC' : 'DNI'} {sesion.documento}</span>
            </li>
            <li><span className="rows__name">Correo</span><span className="muted">{usuario.email}</span></li>
            <li><span className="rows__name">Celular</span><span className="muted mono">{usuario.telefono}</span></li>
            <Fila demo="Editar datos personales">Datos personales</Fila>
          </ul>
        </section>

        {esEmpresa && (
        <section className="panel" aria-labelledby="negocioTitle">
          <header className="panel__head"><h2 id="negocioTitle">Mi negocio</h2></header>
          <ul className="rows">
            <li><span className="rows__name">Nombre</span><span className="muted">{negocio.nombre}</span></li>
            <li><span className="rows__name">RUC</span><span className="muted mono">{negocio.rucEnmascarado}</span></li>
            <li><span className="rows__name">Rubro</span><span className="muted">{negocio.rubro}</span></li>
            <li><span className="rows__name">Régimen tributario<small>Boot lo usa para avisos de comprobantes</small></span><span className="muted">{negocio.regimen}</span></li>
          </ul>
          <header className="panel__head panel__head--sub"><h2>Reglas automáticas</h2></header>
          <p className="hint">Cada gasto en estos comercios se clasifica solo.</p>
          <ReglasNegocio />
        </section>
        )}

        <section className="panel" aria-labelledby="reportesTitle">
          <header className="panel__head"><h2 id="reportesTitle">Reportes</h2><span className="count">Cierre del mes por correo</span></header>
          <EnviarReporte />
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
          <CerrarSesion />
          <p className="hint">Concepto para discusión. Datos ficticios, no es un producto oficial. v2.0</p>
        </div>
      </div>
    </>
  );
}
