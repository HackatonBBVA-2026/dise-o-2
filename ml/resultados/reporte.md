# Reporte de evaluación (generado por `ml/entrenar.py`)

Dataset sintético: 74,121 movimientos de 150 usuarios. Entrenamiento: mayo-agosto 2026 · Prueba: septiembre-octubre 2026.

## Partición temporal

| Tarea | Movimientos de prueba | F1 macro reglas | F1 macro modelo | Accuracy reglas | Accuracy modelo |
|---|---|---|---|---|---|
| ambito | 14,596 | 0.928 | **0.991** | 0.940 | 0.993 |
| categoria | 24,637 | 0.843 | **0.981** | 0.943 | 0.991 |

## Usuarios nuevos (25% no vistos al entrenar)

| Tarea | Movimientos de prueba | F1 macro reglas | F1 macro modelo | Accuracy reglas | Accuracy modelo |
|---|---|---|---|---|---|
| ambito | 3,159 | 0.935 | **0.991** | 0.947 | 0.993 |
| categoria | 5,927 | 0.845 | **0.982** | 0.949 | 0.992 |

## Umbral de confianza 0.7 (ámbito, partición temporal)

- Solo con el umbral: Boot decide en el 99.2% de los movimientos, con accuracy de 99.63%.
- Umbral + política (descripciones genéricas como `PAGO QR` siempre se confirman): decide en el **97.2%**, con accuracy de **99.76%**.
- El **2.8%** va a "Por clasificar" para que el usuario confirme.

Matriz de confusión del ámbito (filas = real, columnas = predicho):

| | negocio | personal |
|---|---|---|
| **negocio** | 10,711 | 45 |
| **personal** | 56 | 3,784 |

## F1 por categoría (partición temporal)

| Categoría | Soporte | Reglas | Modelo |
|---|---|---|---|
| Alquiler local | 64 | 0.968 | 0.976 |
| Comida | 5,714 | 0.973 | 0.987 |
| Educacion | 199 | 0.992 | 0.992 |
| Entretenimiento | 1,205 | 0.983 | 0.990 |
| Flete | 205 | 0.993 | 0.995 |
| Ingreso | 306 | 0.990 | 1.000 |
| Insumos | 272 | 0.989 | 0.989 |
| Mercaderia | 572 | 0.915 | 0.983 |
| Pago a ayudante | 279 | 0.000 | 0.988 |
| Publicidad | 67 | 0.953 | 0.977 |
| Salud | 282 | 0.987 | 0.995 |
| Servicios hogar | 748 | 0.906 | 0.962 |
| Servicios negocio | 240 | 0.632 | 0.881 |
| Suscripciones | 383 | 1.000 | 1.000 |
| Transferencias | 754 | 0.821 | 0.981 |
| Transporte | 4,142 | 0.980 | 0.988 |
| Ventas | 9,057 | 0.980 | 1.000 |
| Vivienda | 148 | 0.950 | 0.972 |

## Errores del modelo con mayor confianza · ambito

| Descripción | Monto | Real | Predicho | Confianza |
|---|---|---|---|---|
| `PAGO QR` | -1417.11 | personal | negocio | 1.00 |
| `COMPRA POS` | -1138.04 | personal | negocio | 1.00 |
| `COMPRA POS` | -236.70 | personal | negocio | 0.98 |
| `PAGO QR` | -46.06 | negocio | personal | 0.98 |
| `RANSF A JORGE L` | -389.36 | personal | negocio | 0.98 |
| `PAGO QR` | -18.66 | negocio | personal | 0.97 |
| `COMPRA POS` | -136.98 | personal | negocio | 0.95 |
| `ENERLIMA RECIBO RFMA` | -147.86 | personal | negocio | 0.95 |
| `TRANSF A MARIA C` | -327.73 | personal | negocio | 0.95 |
| `ENERLIMA RECIBO 3XNR` | -63.37 | negocio | personal | 0.91 |
| `TRANSF` | -251.74 | personal | negocio | 0.91 |
| `TRANSF A JORGE L` | -294.61 | personal | negocio | 0.90 |

## Errores del modelo con mayor confianza · categoria

| Descripción | Monto | Real | Predicho | Confianza |
|---|---|---|---|---|
| `COMPRA POS` | -752.01 | Alquiler local | Mercaderia | 0.98 |
| `RANSF A JORGE L` | -389.36 | Transferencias | Pago a ayudante | 0.97 |
| `PAGO QR` | -905.21 | Alquiler local | Mercaderia | 0.96 |
| `COMPRA POS` | -1138.04 | Vivienda | Mercaderia | 0.96 |
| `ENERLIMA RECIBO WWYI` | -60.59 | Servicios negocio | Servicios hogar | 0.95 |
| `PAGO QR` | -1417.11 | Vivienda | Mercaderia | 0.94 |
| `ENERLIMA RECIBO TP1Z` | -72.10 | Servicios negocio | Servicios hogar | 0.93 |
| `ENERLIMA RECIBO CSG2` | -158.99 | Servicios hogar | Servicios negocio | 0.91 |
| `ENERLIMA RECIBO 04QS` | -146.48 | Servicios hogar | Servicios negocio | 0.91 |
| `ENERLIMA RECIBO RFMA` | -147.86 | Servicios hogar | Servicios negocio | 0.88 |
| `TRANSF A MARIA C` | -327.73 | Transferencias | Pago a ayudante | 0.88 |
| `ENERLIMA RECIBO W7E7` | -83.96 | Servicios negocio | Servicios hogar | 0.87 |
