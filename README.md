# Mío + Boot · Finanzas personales con asistente de IA

Concepto para el Hackathon BBVA AI Financial Life. Datos ficticios; no es un producto oficial.

## Navegación (3 pestañas)

| Pestaña | Ruta | Contenido |
|---|---|---|
| **Inicio** | `/` | Saldo disponible, semáforo de fin de mes, avisos de Boot (duplicados, fin de mes), ingresos vs gastos, cuentas, gasto por categoría, próximos cobros y acceso directo a Boot |
| **Operaciones** | `/operaciones` | Movimientos (búsqueda y filtro), transferir, pagos QR, tipo de cambio |
| **Perfil** | `/perfil` | Datos de cuenta, ajustes (ocultar saldos, avisos), seguridad, ayuda y soporte |

Boot (burbuja flotante) está disponible en las 3 pestañas.

## Correr

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # con recarga automática
```

## Estructura

```
server.js              Rutas Express + API
src/
  data.js              Datos ficticios (reemplazar por la API real)
  finanzas.js          Cálculos: proyección, semáforo, duplicados, simulaciones
  boot.js              Intenciones de Boot: el código calcula, la IA explica
views/
  inicio.ejs | operaciones.ejs | perfil.ejs
  partials/            head, foot, tabbar, boot, boot-avatar
public/
  css/styles.css
  js/app.js            Preferencias, toast
  js/boot.js           Chat de Boot
  js/operaciones.js    Paneles, filtro, transferir, tipo de cambio
```

## API

- `POST /api/boot` `{ "mensaje": "¿Puedo gastar S/ 200?" }` → `{ texto, tabla?, lista?, nota?, chips? }`
- `POST /api/transferencias` `{ cuentaId, destino, monto }` → simulación, no mueve dinero.
