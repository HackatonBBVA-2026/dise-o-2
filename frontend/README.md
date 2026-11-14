# Boot · Finanzas personales con asistente de IA

Concepto para el Hackathon BBVA AI Financial Life. Datos ficticios; no es un producto oficial.

Hecho con **Next.js 16 (App Router)**, **React 19** y **TypeScript**.

## Correr

```bash
npm install
npm run dev      # desarrollo: http://localhost:3000
npm run build && npm start   # producción
```

- `/` muestra la vitrina: un modelo de teléfono con la app dentro.
- `/app` es la app sola (en un celular real, `/` redirige aquí).

## Inicio de sesión: DNI o RUC

`/login` pide el documento y la clave (demo: cualquier clave). El documento define el perfil:

| Documento | Perfil | Qué ve |
|---|---|---|
| **DNI** (8 dígitos) — demo `45678912` | Persona | Solo sus finanzas personales (sin selector de negocio) |
| **RUC** (11 dígitos, se valida el dígito verificador) — demo `10456789124` | Emprendedor o empresa | Arranca en la vista **Negocio** y puede ver Personal o Todo; bandeja para clasificar y reglas |

La sesión es una cookie (`mio.sesion`). `proxy.ts` manda a `/login` a quien no tiene sesión (las API responden 401). Cerrar sesión: Perfil › Cerrar sesión.

## Boot con IA (Groq)

Boot usa un LLM en Groq con *function calling*: el modelo elige una herramienta (`simular_compra`, `ver_negocio`, `simular_reposicion`, `ver_ofertas`, …) y redacta con el resultado. Los números siempre salen del código (`lib/finanzas.ts`, `lib/clasificacion.ts`, `lib/metas.ts`, `lib/ahorro.ts`). Solo responde con datos de la app; nada de información externa. Las herramientas cambian según el perfil.

1. Crea una clave gratis en https://console.groq.com/keys
2. Copia `.env.example` como `.env.local` y pega la clave en `GROQ_API_KEY`
3. `npm run dev`

Sin clave, o si Groq falla, se usa el motor de reglas (`lib/boot.ts`). Si el modelo principal llega al límite gratuito, se usa `GROQ_MODEL_RESPALDO`. Cada respuesta del chat dice si vino de la IA o de las reglas.

## Metas y ofertas (`/app/metas`)

Metas de gasto por categoría (aviso al 80% y al superarla), metas de ahorro (separar dinero descuenta del saldo, simulado) y ofertas ficticias que se desbloquean al ahorrar: paquetes de viaje para personas, beneficios para negocios. Estado en memoria del servidor (`lib/memoria.ts`): se reinicia al reiniciar.

## Instalar en el celular (PWA)

`public/manifest.webmanifest` + `public/sw.js`: desde el celular, abre la app por HTTPS y elige "Instalar app" / "Agregar a inicio". Para probar desde el celular con `npm run dev`, usa un túnel (por ejemplo `cloudflared tunnel --url http://localhost:3000`); `next.config.ts` ya permite `*.trycloudflare.com`.

## Navegación (5 pestañas)

| Pestaña | Ruta | Contenido |
|---|---|---|
| Inicio | `/app` | Tarjeta virtual, saldo (tocar para ocultar), proyección a fin de mes, accesos rápidos (Movimientos, Metas, Avisos, Preguntar), gastos por categoría, próximos cobros |
| Movimientos | `/app/movimientos` | Consulta con búsqueda y filtros; con RUC, filtro y corrección de personal / negocio |
| **Boot** (centro) | `/app/boot` | Chat con el asistente. Acepta `?q=` para enviar una pregunta al abrir |
| Avisos | `/app/avisos` | Lo que Boot detectó, próximos cobros y seguridad |
| Perfil | `/app/perfil` | Cuenta, ajustes, seguridad y ayuda |

## Estructura

```
app/
  layout.tsx              Raíz: fuente Inter y marca "dentro del teléfono"
  page.tsx                Vitrina con el teléfono
  app/
    layout.tsx            Preferencias + barra inferior
    page.tsx              Inicio
    movimientos/ metas/ boot/ avisos/ perfil/
  login/                  Inicio de sesión con DNI o RUC
  api/
    boot/route.ts         POST { mensaje } → respuesta de Boot (Groq o reglas)
    sesion/route.ts       POST iniciar sesión · DELETE cerrar sesión
    metas/route.ts        POST metas de gasto, metas de ahorro y separar ahorro
components/               Nav, Chat, MovimientosView, MetasForms, LoginForm, Money (modo privado), Device, íconos…
lib/
  data.ts                 Datos ficticios (reemplazar por la API real)
  finanzas.ts             Cálculos: proyección, semáforo, duplicados, simulaciones
  boot.ts                 Intenciones de Boot: el código calcula, la IA explica
  format.ts               Formato de soles
styles/
  app.css                 Estilos de la app
  device.css              Estilos del modelo de teléfono
```

## API

- `POST /api/boot` `{ "mensaje": "¿Puedo gastar S/ 200?" }` → `{ texto, tabla?, lista?, nota?, chips? }`
- `POST /api/sesion` `{ documento, clave }` → crea la sesión (DNI → persona, RUC → empresa) · `DELETE /api/sesion` la cierra.
- `POST /api/metas` `{ accion: 'gasto' | 'ahorro' | 'separar', ... }` → metas por perfil (simulación).

La app es de **gestión**: consulta, clasifica, planifica y avisa. No hace transferencias, pagos ni cambio de moneda.
