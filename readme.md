# Hito 1: Simuladores de planificación de procesos (FIFO y SJF)

Proyecto **Uso de IA en el Aprendizaje Basado en Proyectos para el desarrollo y validación de simuladores de planificación de procesos**.
Asignatura: Sistemas Operativos, UTPL. Grupo 5. Directora: Ing. Liliana Elvira Enciso Quispe.

## Objetivo

Construir, con ayuda de IA, un simulador de planificación de procesos con los algoritmos **FIFO (FCFS)** y **SJF no expropiativo**, que muestre el diagrama de Gantt, la cola de listos y las métricas de cada proceso. Cada equipo usó una de las tres herramientas seleccionadas en la evaluación de IAs (Claude, ChatGPT y Gemini). Las versiones se comparan en este repositorio.

## Estructura del repositorio

```
hito1/
├── README.md
├── claude/        # Simulador generado con Claude
├── chatgpt/       # Simulador generado con ChatGPT
├── gemini/        # Simulador generado con Gemini
└── bitacora/      # Bitácoras de prompts y defectos (Excel) de cada equipo
```

## Equipos y herramientas

| Herramienta | Integrantes | Carpeta | Bitácora |
|---|---|---|---|
| Claude | [Mateo Rivera] | `claude/` | `bitacora/[archivo].xlsx` |
| ChatGPT | [Emilio Poma, David Apolo] | `chatgpt/` | `bitacora/[archivo].xlsx` |
| Gemini | [Jhonatan Jara, Santiago Castillo] | `gemini/` | `bitacora/[archivo].xlsx` |

## Archivos de cada simulador

| Archivo | Contenido |
|---|---|
| `[scheduler.js]` | Lógica de FIFO y SJF y cálculo de métricas |
| `[index.html]` | Interfaz: ingreso de procesos, Gantt, cola de listos y métricas |
| `[styles.css]` | Estilos de la interfaz |
| `[ui.js]` | Conexión entre la interfaz y la lógica |
| `[tests.html]` | Pruebas automáticas con los casos del hito |

## Cómo ejecutarlo

**Opción A: servidor local con XAMPP** (la usada por [nombre del equipo])

1. Copie la carpeta del simulador (por ejemplo `claude/`) dentro de `C:\xampp\htdocs\`.
2. Inicie **Apache** desde el panel de control de XAMPP.
3. Abra en el navegador `http://localhost/[carpeta]/index.html`.
4. Para las pruebas automáticas, abra `http://localhost/[carpeta]/tests.html`.

**Opción B: abrir directamente el archivo**

Haga doble clic en `index.html`. [Funciona sin servidor / Si no carga, use la opción A.]

No se necesita instalar nada más: el simulador es HTML, CSS y JavaScript.

## Cómo usarlo

1. Ingrese los procesos con su **nombre, tiempo de llegada y tiempo de ráfaga**.
2. Elija el algoritmo (**FIFO** o **SJF**) o use la comparación lado a lado.
3. Ejecute la simulación y revise:
   - el **diagrama de Gantt**, con los intervalos de CPU ociosa (IDLE) cuando no hay procesos listos;
   - la **cola de listos** en cada instante;
   - las métricas por proceso y los promedios.

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

Se verificaron 8 casos, con resultados esperados calculados a mano y comprobados con un programa aparte.

| Caso | Algoritmo | Procesos (llegada, ráfaga) | Gantt esperado | Espera / retorno promedio |
|---|---|---|---|---|
| CP-F1 | FIFO | P1(0,5), P2(1,3), P3(2,1) | P1 0-5, P2 5-8, P3 8-9 | 3,33 / 6,33 |
| CP-F2 | FIFO | [con tiempo ocioso] | IDLE 0-2, P1 2-5, P2 5-7, IDLE 7-10, P3 10-11 | 0,67 / 2,67 |
| CP-F3 | FIFO | [procesos] | [Gantt] | 3,33 / 6,33 |
| CP-F4 | FIFO | P1(0,7), P2(2,4), P3(4,1), P4(5,4) | P1 0-7, P2 7-11, P3 11-12, P4 12-16 | 4,75 / 8,75 |
| CP-S1 | SJF | P1(0,7), P2(2,4), P3(4,1), P4(5,4) | P1 0-7, P3 7-8, P2 8-12, P4 12-16 | 4,00 / 8,00 |
| CP-S2 | SJF | [procesos] | P3 0-1, P1 1-4, P2 4-7 | 1,67 / 4,00 |
| CP-S3 | SJF | P1(0,2), P2(5,3), P3(5,1) | P1 0-2, IDLE 2-5, P3 5-6, P2 6-9 | 0,33 / 2,33 |
| CP-S4 | SJF | P1(0,6), P2(1,1) | P1 0-6, P2 6-7 | 2,50 / 6,00 |

**Resultado en este simulador:** [8 de 8 casos aprobados / indicar cuáles fallaron y por qué].

## Uso de IA y trazabilidad

- Herramienta usada: [Claude / ChatGPT / Gemini], versión o plan: [.].
- Los prompts enviados, sus respuestas resumidas y los ajustes manuales están en la bitácora (`bitacora/[archivo].xlsx`, hoja «2. Bitácora»).
- Los defectos encontrados, con su explicación según la teoría de Sistemas Operativos, están en la hoja «5. Defectos» de la misma bitácora.
- Todo el código fue generado con la herramienta indicada y revisado por el equipo. Los cambios hechos a mano están registrados en la bitácora.

## Defectos encontrados (resumen)

| # | Defecto | Gravedad | Corregido |
|---|---|---|---|
| 1 | [descripción breve] | [Alta/Media/Baja] | [Sí/No] |

## Limitaciones conocidas

- [Ej.: aún no incluye Round Robin ni Prioridades, que corresponden al ciclo 2.]
- [Otras limitaciones.]

## Autores

Grupo 5, Sistemas Operativos, UTPL: Emilio Poma, Mateo Rivera, David Apolo, Santiago Castillo y Jhonatan Jara.
