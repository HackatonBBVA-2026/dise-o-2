// Qué avisos llegan como notificación push y cuándo. SOLO SERVIDOR.
// - Pagos y transferencias enviadas o recibidas.
// - Metas de gasto: al pasar el 80% y al superarlas (una vez por cambio de nivel, no en cada pago).
// - Ofertas que se desbloquean al ahorrar.
import { soles } from './format';
import { memoria } from './memoria';
import { verMetas, type NivelMeta } from './metas';
import type { Constancia } from './operaciones';
import { enviarPush } from './push';
import type { Perfil } from './sesion';

const avisadas = memoria<Record<Perfil, Record<string, NivelMeta>>>('metasAvisadas', () => ({ persona: {}, empresa: {} }));

/** Al crear o cambiar una meta, su aviso vuelve a empezar (así se puede probar varias veces). */
export function reiniciarAvisoMeta(perfil: Perfil, categoria: string) {
  delete avisadas[perfil][categoria];
}

export async function avisarMetasGasto(perfil: Perfil) {
  const tareas: Promise<number>[] = [];
  for (const m of verMetas(perfil)) {
    const antes = avisadas[perfil][m.categoria];
    avisadas[perfil][m.categoria] = m.nivel;
    if (m.nivel === antes || (m.nivel !== 'cerca' && m.nivel !== 'superada')) continue;
    tareas.push(
      enviarPush(perfil, {
        title: m.nivel === 'superada' ? `Superaste tu meta de ${m.categoria}` : `Estás cerca de tu meta de ${m.categoria}`,
        body: `Llevas ${soles(m.gastado)} de ${soles(m.limite)} (${m.pct}%).${m.nivel === 'cerca' ? ` Te quedan ${soles(Math.max(0, m.disponible))} este mes.` : ' Mío te ayuda a ajustar el resto del mes.'}`,
        url: '/app/metas',
        tag: `meta-${m.categoria}`,
      })
    );
  }
  await Promise.all(tareas);
}

export async function avisarOperacion(perfil: Perfil, c: Constancia) {
  await enviarPush(perfil, {
    title: c.tipo === 'celular' ? 'Pago enviado' : 'Transferencia realizada',
    body: `${soles(c.monto)} a ${c.destino}. Saldo disponible: ${soles(c.saldoDisponible)}.`,
    url: '/app/movimientos',
    tag: `op-${c.numero}`,
  });
  await avisarMetasGasto(perfil);
}

export async function avisarRecibida(perfil: Perfil, r: { de: string; monto: number; negocio: boolean; saldoDisponible: number }) {
  return enviarPush(perfil, {
    title: r.negocio ? 'Te pagó un cliente' : 'Recibiste una transferencia',
    body: `${r.de} te envió ${soles(r.monto)}. Saldo disponible: ${soles(r.saldoDisponible)}.`,
    url: '/app/movimientos',
    tag: `in-${Date.now()}`,
  });
}

export async function avisarOfertas(perfil: Perfil, nuevas: { titulo: string; beneficio: string }[]) {
  await Promise.all(
    nuevas.map((o) => enviarPush(perfil, { title: '¡Desbloqueaste una oferta!', body: `${o.titulo}: ${o.beneficio}.`, url: '/app/metas', tag: `oferta-${o.titulo}` }))
  );
}
