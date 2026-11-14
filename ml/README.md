# Mío · Dataset sintético, Modelo/IA y evidencia técnica

Todo lo de esta carpeta se reproduce con semilla fija:

```bash
pip install -r ml/requirements.txt
python ml/generar_dataset.py          # crea ml/datos/movimientos.csv (74,121 filas, ~1 s)
python ml/entrenar.py                 # entrena, evalúa y escribe ml/resultados/ (~35 s)
python -m unittest discover -s ml -v  # 9 pruebas
```

---

## 1. Dataset sintético

**Qué es:** 6 meses (mayo–octubre 2026) de movimientos bancarios de **150 usuarios ficticios**:

- **90 personas**, que entran con DNI.
- **60 emprendedores**, que entran con RUC. Tienen cuatro rubros: bodega, venta por redes, taller y comida.

Los emprendedores usan **una sola cuenta** para el negocio y para la casa, que es el problema que resuelve Mío. Todos los nombres de comercios y personas son **ficticios**. Hay una muestra de 400 filas en `datos/muestra_movimientos.csv`.

### Diccionario de datos (`datos/movimientos.csv`)

| Columna | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `id` | texto | Identificador único del movimiento | `M004512` |
| `usuario_id` | texto | `P###` = persona, `E###` = emprendedor | `E017` |
| `perfil` | `persona` \| `empresa` | Cómo entra a la app (DNI / RUC) | `empresa` |
| `rubro` | texto | Rubro del negocio (vacío en personas) | `bodega` |
| `fecha` | fecha ISO | Día del movimiento | `2026-09-12` |
| `descripcion` | texto (≤30) | Texto como en el extracto: mayúsculas, códigos, truncado | `PAGO QR DE ROSA Q` |
| `monto` | número | Soles; positivo = ingreso, negativo = gasto | `-455.20` |
| `medio` | categoría | `qr`, `tarjeta`, `transferencia`, `debito`, `deposito` | `qr` |
| `categoria` | etiqueta | 18 clases (Ventas, Mercadería, Comida, Pago a ayudante…) | `Mercaderia` |
| `ambito` | etiqueta | `negocio` o `personal` | `negocio` |

### Supuestos

- **Persona:**
  - recibe sueldo mensual o quincenal entre S/ 1,130 y S/ 4,500;
  - el 35 % tiene ingresos extra irregulares;
  - el 55 % alquila vivienda;
  - tiene de 0 a 3 suscripciones.
- **Emprendedor:**
  - vende entre S/ 120 y S/ 650 diarios, un 35 % más de viernes a domingo, y muchos no abren el domingo;
  - cobra por QR (el banco agrupa los cobros en 1 a 4 abonos al día), con depósitos de efectivo y, en el 40 % de los casos, abonos semanales de POS;
  - repone mercadería entre 8 % y 25 % de los días;
  - el 60 % paga un ayudante cada sábado;
  - el 60 % alquila local.
- **Gasto personal del emprendedor:** es más bajo que el de una persona asalariada (factor 0.55).

### Casos difíciles a propósito (justificación de realismo)

| Caso | Por qué existe en la vida real |
|---|---|
| **Pago al ayudante** = `TRANSF A <nombre>`, mismo texto que una transferencia personal | Los bancos no distinguen a quién le pagas ni para qué |
| **Mismo mayorista** (`MEGAMAYORISTA`) para compras del negocio y de la casa | El bodeguero compra ahí lo de su tienda y lo de su familia |
| **Mismo recibo de luz** (`ENERLIMA RECIBO`) para el local y la casa | La empresa de luz es la misma |
| **Descripciones casi vacías** (`PAGO QR`, `COMPRA POS`, `TRANSF`) en el 2 % | Pasa en extractos reales |
| **Errores de tipeo** (3 %) y **truncado a 30 caracteres** | Los extractos cortan y ensucian el texto |
| **Cobros duplicados** de suscripciones (4 %) | Es un reclamo común |

### Controles de calidad

Se revisan en `controles_calidad()` y fallan si algo no cuadra:
- sin vacíos ni ids repetidos;
- montos distintos de 0;
- signo coherente: ingresos positivos y gastos negativos;
- una persona (DNI) nunca tiene movimientos del negocio;
- las categorías del negocio siempre tienen ámbito `negocio`.

**Distribución resultante:**
- Ventas 27,226 · Comida 17,313 · Transporte 12,508 · … · Alquiler local 192.
- Ámbito de los emprendedores: 32,317 de negocio y 11,556 personales.

---

## 2. Modelo / IA

Mío usa **dos piezas de IA** con roles separados. **Los números siempre los calcula el código.**

### 2.1 Clasificador de movimientos (ML)

| | Baseline (reglas) | Modelo |
|---|---|---|
| Técnica | 17 reglas por palabra clave, como las escribiría un desarrollador | Regresión logística multiclase (scikit-learn) |
| Features | Solo la descripción | TF-IDF de caracteres (2–5) y de palabras de la descripción + log del monto + ingreso o gasto + medio + día de la semana + tramo del mes + perfil + rubro |
| Salida | Una clase | Clase + **probabilidad** (confianza) |

**Tareas que resuelve:**
- **Ámbito** (negocio o personal): solo para emprendedores, porque con DNI todo es personal.
- **Categoría:** para todos los usuarios.

**Política de confianza** (la misma que usa la app en `lib/clasificacion.ts`):
- Si la probabilidad es menor a **0.7**, Boot no decide y el movimiento va a **"Por clasificar"** para que el usuario confirme.
- Las descripciones genéricas (`PAGO QR`, `COMPRA POS`, `TRANSF`) **siempre** se confirman.
- Cuando el usuario corrige un movimiento, esa corrección queda como nueva etiqueta para reentrenar.

### 2.2 Boot: agente con LLM (Groq)

- **Modelo:**
  - principal: `openai/gpt-oss-120b` en Groq;
  - de respaldo: `openai/gpt-oss-20b`, si se llega al límite de uso;
  - sin clave, o si Groq falla, responde un **motor de reglas** (`frontend/lib/boot.ts`).
- **Agente con herramientas (function calling):**
  - El LLM no calcula: elige una herramienta, el código la ejecuta y el LLM redacta con ese resultado.
  - Herramientas comunes: `ver_resumen_mes`, `proyectar_fin_de_mes`, `simular_compra`, `ver_movimientos`, `ver_proximos_cobros`, `ver_cobros_duplicados`, `ver_cuentas_y_tarjetas`, `simular_prestamo`, `definir_meta_gasto`, `ver_metas`, `ver_metas_ahorro`, `crear_meta_ahorro`, `separar_ahorro`, `ver_ofertas`.
  - Solo con DNI: `ver_suscripciones`.
  - Solo con RUC: `ver_negocio`, `simular_reposicion`, `ver_por_clasificar`.
- **Prompt de sistema** (`frontend/lib/llm.ts`, función `instrucciones`). Reglas principales:
  - nunca calcular ni inventar cifras;
  - responder solo con datos de la app, sin información externa;
  - las ofertas son solo las de `ver_ofertas`;
  - es simulación, no asesoría;
  - con DNI no hablar del negocio y pedir que entre con RUC.
- **Controles de salida:** quita el markdown, elimina respuestas duplicadas y limita a 4 vueltas LLM → herramienta → LLM, con un timeout de 12 s.

---

## 3. Evidencia técnica

Resultados de `python ml/entrenar.py`, también en `resultados/metricas.json` y `resultados/reporte.md`.

### Métricas

**Partición temporal:** entrena con mayo–agosto y prueba con septiembre–octubre.

| Tarea | Movimientos de prueba | F1 macro reglas | F1 macro modelo | Accuracy reglas | Accuracy modelo |
|---|---|---|---|---|---|
| Ámbito | 14,596 | 0.928 | **0.991** | 0.940 | 0.993 |
| Categoría | 24,637 | 0.843 | **0.981** | 0.943 | 0.991 |

**Usuarios nuevos:** el 25 % de los usuarios no se ve al entrenar, y además se prueba con meses futuros.

| Tarea | Movimientos de prueba | F1 macro reglas | F1 macro modelo |
|---|---|---|---|
| Ámbito | 3,159 | 0.935 | **0.991** |
| Categoría | 5,927 | 0.845 | **0.982** |

**Donde más gana el modelo** (F1 por categoría, reglas → modelo):
- **Pago a ayudante:** 0.000 → **0.988**. Las reglas no pueden separarlo de una transferencia; el modelo usa el monto fijo, el sábado y el perfil.
- **Servicios negocio:** 0.632 → 0.881.
- **Transferencias:** 0.821 → 0.981.
- **Mercadería:** 0.915 → 0.983.

**Umbral 0.7 + política de genéricas** (ámbito):
- Boot decide solo en el **97.2 %** de los movimientos, con **99.76 %** de accuracy.
- El 2.8 % va a "Por clasificar".
- Solo con el umbral, sin la política: decide en el 99.2 % con 99.63 % de accuracy.

### Casos de prueba (`test_ml.py`, 9 pruebas, todas pasan)

- **Dataset:**
  - es reproducible con la misma semilla y cambia con otra;
  - pasa los controles de calidad;
  - contiene los casos difíciles.
- **Particiones:** no hay fuga de datos; el entrenamiento siempre es anterior a la prueba y en "usuarios nuevos" no se repiten usuarios.
- **Modelo:**
  - el baseline acierta los casos conocidos;
  - detecta las descripciones genéricas;
  - **el modelo supera al baseline** en las dos tareas;
  - las probabilidades suman 1.

### Limitaciones (sin maquillar)

- **Datos sintéticos generados por nosotros:** el modelo aprende patrones que nosotros mismos pusimos. Las métricas son **optimistas** y no se deben esperar iguales con extractos reales. Lo que sí muestran es que **el modelo resuelve lo que las reglas no pueden** (pago al ayudante, servicios del local, mayorista compartido) y que la política de confianza manda a confirmar lo dudoso.
- **Sobreconfianza:** con descripciones genéricas, el modelo se equivocó con confianza de 0.95 a 1.00. Por eso existe la política de "genéricas siempre se confirman". Además, la calibración de probabilidades es un pendiente.
- **Recibos de luz del local y de la casa:** siguen siendo el error más común, porque el texto es idéntico y el monto se superpone.
- **Clientes nuevos:** un emprendedor nuevo no tiene historial. Al inicio dependerá más de "Por clasificar".
- **Integración con la app:** el clasificador **aún no está conectado a la app**. Hoy la app usa la clasificación de ejemplo de `frontend/lib/data.ts` con el mismo umbral de 0.7. El siguiente paso es exponerlo, ya sea exportando los pesos a JSON para ejecutarlo en TypeScript o con un endpoint en Python.

### Trazabilidad

- **Datos:** semilla `42`, `generar_dataset.py`.
- **Partición:** corte `2026-09-01` y `GroupShuffleSplit(random_state=7)` en `entrenar.py`.
- **Versiones probadas:** Python 3.12, scikit-learn 1.9, pandas 3.0, numpy 2.5.
- **Modelos guardados:** en `modelos/*.joblib`, que se regeneran y no se suben al repo.
- **Errores:** los de mayor confianza quedan listados en `resultados/reporte.md` para revisarlos.
