# Hito 1: Simuladores de planificación de procesos (FIFO y SJF)

Proyecto **Uso de IA en el Aprendizaje Basado en Proyectos para el desarrollo y validación de simuladores de planificación de procesos**.
Asignatura: Sistemas Operativos, UTPL. Grupo 5. Directora: Ing. Liliana Elvira Enciso Quispe.

## Objetivo

Construir, con ayuda de IA, un simulador de planificación de procesos con los algoritmos **FIFO (FCFS)** y **SJF no expropiativo**, que muestre el diagrama de Gantt, la cola de listos y las métricas de cada proceso. El grupo desarrolló una versión con cada una de las tres herramientas seleccionadas en la evaluación de IAs (Claude, ChatGPT y Gemini), usando los mismos prompts. Las versiones se comparan en este repositorio.

## Estructura del repositorio

```
hito1/
├── README.md
├── claude/        # Simulador generado con Claude
├── chatgpt/       # Simulador generado con ChatGPT
├── gemini/        # Simulador generado con Gemini
└── bitacora/      # Bitácoras de prompts y defectos, y comparativo 3×2 (Excel)
    ├── Hito1_Claude.xlsx
    ├── Hito1_ChatGPT.xlsx
    ├── Hito1_Gemini.xlsx
    └── Comparativo_Hito1_3x2_Grupo_5.xlsx
```

## Archivos de cada simulador

| Archivo | Contenido |
|---|---|
| `scheduler.js` | Lógica de FIFO y SJF y cálculo de métricas |
| `index.html` | Interfaz: ingreso de procesos, Gantt, cola de listos y métricas |
| `styles.css` | Estilos de la interfaz |
| `ui.js` | Conexión entre la interfaz y la lógica |
| `tests.html` | Pruebas automáticas con los casos del hito |

## Cómo ejecutarlo

Los cuatro archivos de cada simulador deben estar en la misma carpeta.

**Opción A: abrir directamente el archivo**

Haga doble clic en `index.html`. Funciona sin servidor en `claude/` y en `chatgpt/`. La versión de `gemini/` carga `scheduler.js` como módulo ES y el navegador lo bloquea al abrir el archivo directamente; para esa versión use la opción B. Si en cualquier carpeta la página no carga, use también la opción B.

No se necesita instalar nada más: el simulador es HTML, CSS y JavaScript.

**Opción B: servidor local con XAMPP**

1. Copie la carpeta del simulador (por ejemplo `claude/`) dentro de `C:\xampp\htdocs\`.
2. Inicie **Apache** desde el panel de control de XAMPP.
3. Abra en el navegador `http://localhost/claude/index.html` (cambie `claude` por `chatgpt` o `gemini` según la versión).
4. Para las pruebas automáticas, abra `http://localhost/claude/tests.html`.

Cualquier otro servidor local sirve igual, por ejemplo `python3 -m http.server` desde la carpeta del simulador y luego `http://localhost:8000/index.html`.

## Cómo usarlo

1. Ingrese los procesos con su **identificador, tiempo de llegada, tiempo de ráfaga y prioridad** (la prioridad se guarda, pero no se usa en FIFO ni en SJF). La interfaz no acepta ráfagas menores o iguales a 0, llegadas negativas ni identificadores repetidos.
2. Elija el algoritmo (**FIFO** o **SJF**) y pulse **Simular**, o pulse **Comparar** para ejecutar ambos con los mismos procesos: se muestran uno debajo del otro, con la misma escala de tiempo, y una tabla con los promedios de cada algoritmo.
3. Revise:
   - el **diagrama de Gantt**, con los intervalos de CPU ociosa (IDLE) cuando no hay procesos listos;
   - la **cola de listos** en cada instante;
   - las métricas por proceso y los promedios.
4. **Reiniciar** limpia los resultados.

## Supuestos de la simulación

- Tiempo discreto, en unidades enteras.
- Algoritmos **no expropiativos**: un proceso que ya está en CPU no se interrumpe.
- El cambio de contexto cuesta 0.
- Desempate: primero por tiempo de llegada y luego por orden de ingreso en la lista.
- En FIFO y SJF no expropiativos, el tiempo de respuesta coincide con el de espera.
- Si no hay procesos listos, la CPU queda en **IDLE** hasta la siguiente llegada.

## Métricas

- **Tiempo de retorno** = tiempo de finalización − tiempo de llegada
- **Tiempo de espera** = tiempo de retorno − ráfaga
- **Tiempo de respuesta** = tiempo de primer uso de CPU − tiempo de llegada

## Casos de prueba

Se verificaron 8 casos, con resultados esperados calculados a mano y comprobados con un programa aparte. Las tres versiones aprobaron los 8 casos, tanto en `tests.html` como en la interfaz.

| Caso | Algoritmo | Procesos (llegada, ráfaga) | Gantt esperado | Espera / retorno promedio |
|---|---|---|---|---|
| CP-F1 | FIFO | P1(0,5), P2(1,3), P3(2,1) | P1 0-5, P2 5-8, P3 8-9 | 3,33 / 6,33 |
| CP-F2 | FIFO | P1(2,3), P2(3,2), P3(10,1) (con tiempo ocioso) | IDLE 0-2, P1 2-5, P2 5-7, IDLE 7-10, P3 10-11 | 0,67 / 2,67 |
| CP-F3 | FIFO | P1(0,4), P2(0,2), P3(0,3) (llegadas simultáneas) | P1 0-4, P2 4-6, P3 6-9 | 3,33 / 6,33 |
| CP-F4 | FIFO | P1(0,7), P2(2,4), P3(4,1), P4(5,4) | P1 0-7, P2 7-11, P3 11-12, P4 12-16 | 4,75 / 8,75 |
| CP-S1 | SJF | P1(0,7), P2(2,4), P3(4,1), P4(5,4) | P1 0-7, P3 7-8, P2 8-12, P4 12-16 | 4,00 / 8,00 |
| CP-S2 | SJF | P1(0,3), P2(0,3), P3(0,1) (empate de ráfaga) | P3 0-1, P1 1-4, P2 4-7 | 1,67 / 4,00 |
| CP-S3 | SJF | P1(0,2), P2(5,3), P3(5,1) | P1 0-2, IDLE 2-5, P3 5-6, P2 6-9 | 0,33 / 2,33 |
| CP-S4 | SJF | P1(0,6), P2(1,1) | P1 0-6, P2 6-7 | 2,50 / 6,00 |

CP-F4 y CP-S1 usan los mismos procesos para comparar los dos algoritmos: SJF reduce la espera promedio de 4,75 a 4,00.

## Uso de IA y trazabilidad

Los tres simuladores se pidieron con los mismos prompts (P1: lógica, P2: interfaz, P3: comparación, P4: pruebas, P5: corrección solo si algo falla).

| Herramienta | Modelo | Plan | Navegador de prueba | Bitácora |
|---|---|---|---|---|
| Claude | Opus 5.5 (esfuerzo medio) | Pro (de pago) | Brave | `bitacora/Hito1_Claude.xlsx` |
| ChatGPT | GPT-6 | Gratuito | Mozilla Firefox | `bitacora/Hito1_ChatGPT.xlsx` |
| Gemini | Automático (la interfaz no indica el modelo) | Gratuito | Google Chrome | `bitacora/Hito1_Gemini.xlsx` |

- Los prompts enviados, sus respuestas resumidas y los ajustes manuales están en la hoja «2. Bitácora» de cada archivo.
- Los defectos encontrados, con su explicación según la teoría de Sistemas Operativos, están en la hoja «5. Defectos» de la misma bitácora.
- Todo el código fue generado con la herramienta indicada y revisado por el grupo. No se hicieron cambios manuales al código; cualquiera que se hiciera quedaría registrado en la bitácora.

## Resultados del análisis

Cada herramienta se calificó con una rúbrica de 7 criterios (corrección del Gantt, de las métricas, manejo del IDLE y los desempates, fidelidad de la interfaz, calidad de la explicación, autonomía y defectos), de forma separada para FIFO y para SJF. El detalle está en `bitacora/Comparativo_Hito1_3x2_Grupo_5.xlsx`.

| Herramienta | FIFO | SJF | Prompts de corrección (P5) | Defectos |
|---|---|---|---|---|
| Claude | 100 | 100 | 0 | 0 |
| ChatGPT | 94 | 94 | 1 | 2 (medios, corregidos) |
| Gemini | 92 | 92 | 1 | 1 (medio, corregido) |

Defectos registrados:

| Herramienta | ID | Defecto | Gravedad | Corrección |
|---|---|---|---|---|
| ChatGPT | D01 | `tests.html` buscaba `window.Scheduler`, pero `scheduler.js` no lo exponía; los 8 casos aparecían como FAIL | Media | P5, un intento |
| ChatGPT | D02 | La cola de listos incluía al proceso que terminaba en t = fin | Media | P5, un intento |
| Gemini | D01 | Los paneles de resultados no se ocultaban: una regla CSS anulaba el atributo `hidden` | Media | P5, un intento |

Como los dos algoritmos comparten el mismo motor de simulación en cada herramienta, FIFO y SJF obtienen el mismo puntaje; lo que cambia entre versiones es la herramienta.

**Limitaciones.** Claude se evaluó con plan de pago y las otras dos con plan gratuito. Cada herramienta se probó una sola vez, por lo que los resultados pueden variar entre ejecuciones. La brecha entre ChatGPT y Gemini es de 2 puntos y depende de cómo se clasificó cada defecto. La comparación es provisional: la elección de la mejor herramienta por algoritmo se hace al cierre del ciclo, después del segundo bimestre.

## Autores

Grupo 5, Sistemas Operativos, UTPL: Emilio Poma, Mateo Rivera, David Apolo, Santiago Castillo y Jhonatan Jara.
