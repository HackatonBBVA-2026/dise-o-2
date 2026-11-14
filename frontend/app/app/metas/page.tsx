import Link from 'next/link';
import { FormMetaAhorro, FormMetaGasto, FormSeparar } from '@/components/MetasForms';
import { Money } from '@/components/Money';
import { categoriasDe, verMetas, type NivelMeta } from '@/lib/metas';
import { verMetasAhorro, verOfertas } from '@/lib/ahorro';
import { soles } from '@/lib/format';
import { sesionActual } from '@/lib/sesion-servidor';

export const metadata = { title: 'Metas' };
export const dynamic = 'force-dynamic'; // las metas cambian con cada acción

const COLOR: Record<NivelMeta, string> = { ok: 'var(--exito)', 'en riesgo': 'var(--aviso)', cerca: 'var(--aviso)', superada: 'var(--peligro)' };
const TEXTO: Record<NivelMeta, string> = { ok: 'Vas bien', 'en riesgo': 'En riesgo', cerca: 'Cerca del límite', superada: 'Superada' };
const meses = (n: number) => `${n} mes${n === 1 ? '' : 'es'}`;

export default async function MetasPage() {
  const { perfil } = await sesionActual();
  const esEmpresa = perfil === 'empresa';
  const gasto = verMetas(perfil);
  const ahorro = verMetasAhorro(perfil);
  const ofertas = verOfertas(perfil);
  const categorias = categoriasDe(perfil).map((c) => c.nombre);

  return (
    <>
      <header className="pagehead">
        <div>
          <p className="pagehead__eyebrow">{esEmpresa ? 'Tu negocio ahorra' : 'Ahorras'} <Money>{soles(ahorro.totalAhorrado)}</Money></p>
          <h1>Metas</h1>
        </div>
        <Link className="link" href="/app">Volver</Link>
      </header>

      <div className="grid">
        <section className="panel" aria-labelledby="gastoTitle">
          <header className="panel__head">
            <h2 id="gastoTitle">{esEmpresa ? 'Límites de gasto del negocio' : 'Metas de gasto'}</h2>
            <span className="count">Aviso al 80% y al superarla</span>
          </header>
          {gasto.length === 0 && <p className="hint">Aún no tienes metas de gasto. Ponle un tope mensual a una categoría.</p>}
          <ul className="metas">
            {gasto.map((m) => (
              <li key={m.categoria} className="meta">
                <div className="meta__top">
                  <strong>{m.categoria}</strong>
                  <Money>{soles(m.gastado)} <small>de {soles(m.limite)}</small></Money>
                </div>
                <div className="ratio" aria-hidden="true"><span style={{ width: `${Math.min(100, m.pct)}%`, background: COLOR[m.nivel] }} /></div>
                <p className="meta__foot">
                  <span style={{ color: COLOR[m.nivel] }}>{TEXTO[m.nivel]} · {m.pct}%</span> · Al ritmo actual cerrarías en {soles(Math.round(m.proyectadoFinDeMes))}
                </p>
              </li>
            ))}
          </ul>
          <FormMetaGasto categorias={categorias} />
        </section>

        <section className="panel" aria-labelledby="ahorroTitle">
          <header className="panel__head">
            <h2 id="ahorroTitle">Metas de ahorro</h2>
            <span className="count">Sugerido: {soles(ahorro.ahorroSugeridoMensual)} al mes</span>
          </header>
          <ul className="metas">
            {ahorro.metas.map((m) => (
              <li key={m.nombre} className="meta">
                <div className="meta__top">
                  <strong>{m.nombre}</strong>
                  <Money>{soles(m.ahorrado)} <small>de {soles(m.objetivo)}</small></Money>
                </div>
                <div className="ratio" aria-hidden="true"><span style={{ width: `${m.pct}%`, background: 'var(--exito)' }} /></div>
                <p className="meta__foot">{m.cumplida ? '¡Meta cumplida!' : `Te faltan ${soles(m.falta)} · unos ${meses(m.mesesEstimados)} al ritmo sugerido`}</p>
                {!m.cumplida && <FormSeparar nombre={m.nombre} />}
              </li>
            ))}
          </ul>
          <FormMetaAhorro />
          <p className="hint">Separar dinero lo descuenta de tu saldo disponible. Simulación: no se mueve dinero real.</p>
        </section>

        <section className="panel span-2" aria-labelledby="ofertasTitle">
          <header className="panel__head">
            <h2 id="ofertasTitle">{esEmpresa ? 'Beneficios para tu negocio' : 'Ofertas por ahorrar'}</h2>
            <span className="count">{ofertas.ofertas.filter((o) => o.desbloqueada).length} de {ofertas.ofertas.length} desbloqueadas</span>
          </header>
          <p className="hint">Mientras más ahorras en tus metas, más beneficios desbloqueas.</p>
          <ul className="ofertas">
            {ofertas.ofertas.map((o) => (
              <li key={o.id} className={`oferta${o.desbloqueada ? ' is-on' : ''}`}>
                <span className="oferta__tipo">{o.tipo}</span>
                <strong>{o.titulo}</strong>
                <span className="oferta__beneficio">{o.beneficio}</span>
                <small className="oferta__socio">{o.socio}</small>
                {o.desbloqueada ? (
                  <>
                    <span className="tag tag--ok">Desbloqueada</span>
                    <button type="button" className="btn-sm" data-demo={`Usar oferta: ${o.titulo}`}>Usar oferta</button>
                  </>
                ) : (
                  <>
                    <div className="ratio" aria-hidden="true"><span style={{ width: `${Math.round((ofertas.totalAhorrado / o.requisito) * 100)}%` }} /></div>
                    <small>Ahorra {soles(o.requisito)} · te faltan {soles(o.falta)} (~{meses(o.mesesEstimados)})</small>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="hint">Ofertas y socios ficticios para el concepto.</p>
        </section>
      </div>
    </>
  );
}
