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

## Navegación (5 pestañas)

| Pestaña | Ruta | Contenido |
|---|---|---|
| Inicio | `/app` | Tarjeta virtual, saldo (tocar para ocultar), proyección a fin de mes, accesos rápidos, gastos por categoría, próximos cobros |
| Operaciones | `/app/operaciones` | Movimientos, transferir, pagos QR y tipo de cambio (`#movimientos`, `#transferir`, `#qr`, `#cambio`) |
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
    operaciones/ boot/ avisos/ perfil/
  api/
    boot/route.ts         POST { mensaje } → respuesta de Boot
    transferencias/route.ts  POST simulación de transferencia
components/               Nav, Chat, OperacionesView, Money (modo privado), Device, íconos…
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
- `POST /api/transferencias` `{ cuentaId, destino, monto }` → simulación; no mueve dinero.
