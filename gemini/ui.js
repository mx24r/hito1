import { fifo, sjf } from "./scheduler.js";

// Datos iniciales de ejemplo para facilitar pruebas inmediatas
const PROCESOS_INICIALES = [
  { id: "P1", tiempoLlegada: 0, rafaga: 5, prioridad: 2 },
  { id: "P2", tiempoLlegada: 1, rafaga: 3, prioridad: 1 },
  { id: "P3", tiempoLlegada: 2, rafaga: 8, prioridad: 3 },
  { id: "P4", tiempoLlegada: 3, rafaga: 2, prioridad: 2 }
];

// Paleta de colores con alto contraste (fondo claro + texto oscuro)
const PALETA_PROCESOS = [
  { bg: "#dbeafe", text: "#1e3a8a" },
  { bg: "#dcfce7", text: "#14532d" },
  { bg: "#fef3c7", text: "#78350f" },
  { bg: "#fce7f3", text: "#831843" },
  { bg: "#e0e7ff", text: "#312e81" },
  { bg: "#ccfbf1", text: "#134e4a" },
  { bg: "#ffedd5", text: "#7c2d12" },
  { bg: "#f3e8ff", text: "#581c87" }
];

// Referencias al DOM
const tbodyProcesos = document.getElementById("tbody-procesos");
const btnAgregarFila = document.getElementById("btn-agregar-fila");
const btnSimular = document.getElementById("btn-simular");
const btnComparar = document.getElementById("btn-comparar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const selectAlgoritmo = document.getElementById("select-algoritmo");
const mensajeError = document.getElementById("mensaje-error");

const panelResultados = document.getElementById("panel-resultados");
const badgeAlgoritmo = document.getElementById("badge-algoritmo");
const ganttChart = document.getElementById("gantt-chart");
const ganttAxis = document.getElementById("gantt-axis");
const tbodyMetricas = document.getElementById("tbody-metricas");
const tfootMetricas = document.getElementById("tfoot-metricas");
const tbodyCola = document.getElementById("tbody-cola");

const panelComparacion = document.getElementById("panel-comparacion");
const badgeEscalaComparacion = document.getElementById("badge-escala-comparacion");
const ganttChartFifo = document.getElementById("gantt-chart-fifo");
const ganttAxisFifo = document.getElementById("gantt-axis-fifo");
const ganttChartSjf = document.getElementById("gantt-chart-sjf");
const ganttAxisSjf = document.getElementById("gantt-axis-sjf");
const tbodyComparacionPromedios = document.getElementById("tbody-comparacion-promedios");

let contadorId = 5;

function mostrarError(texto) {
  mensajeError.textContent = texto;
  mensajeError.hidden = false;
}

function ocultarError() {
  mensajeError.textContent = "";
  mensajeError.hidden = true;
}

function limpiarMarcasInvalidas() {
  tbodyProcesos.querySelectorAll(".input-cell").forEach((input) => {
    input.classList.remove("input-invalid");
  });
}

function crearFilaProceso({ id = "", tiempoLlegada = 0, rafaga = 1, prioridad = 1 } = {}) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td>
      <input
        type="text"
        class="input-cell input-id"
        aria-label="Identificador del proceso"
        value="${id}"
        placeholder="Ej. P1"
        required
      />
    </td>
    <td>
      <input
        type="number"
        class="input-cell input-llegada"
        aria-label="Tiempo de llegada"
        value="${tiempoLlegada}"
        min="0"
        step="1"
        required
      />
    </td>
    <td>
      <input
        type="number"
        class="input-cell input-rafaga"
        aria-label="Ráfaga de CPU"
        value="${rafaga}"
        min="1"
        step="1"
        required
      />
    </td>
    <td>
      <input
        type="number"
        class="input-cell input-prioridad"
        aria-label="Prioridad"
        value="${prioridad}"
        step="1"
      />
    </td>
    <td class="col-acciones">
      <button type="button" class="btn btn-danger btn-eliminar" aria-label="Eliminar proceso">
        Eliminar
      </button>
    </td>
  `;

  tr.querySelector(".btn-eliminar").addEventListener("click", () => {
    tr.remove();
    ocultarError();
  });

  tbodyProcesos.appendChild(tr);
}

function cargarProcesosIniciales() {
  tbodyProcesos.innerHTML = "";
  PROCESOS_INICIALES.forEach((p) => crearFilaProceso(p));
  contadorId = PROCESOS_INICIALES.length + 1;
}

function leerYValidarProcesos() {
  ocultarError();
  limpiarMarcasInvalidas();

  const filas = Array.from(tbodyProcesos.querySelectorAll("tr"));
  if (filas.length === 0) {
    mostrarError("Agrega al menos un proceso para ejecutar la simulación.");
    return null;
  }

  const procesos = [];
  const idsVistos = new Set();

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const numFila = i + 1;

    const inputId = fila.querySelector(".input-id");
    const inputLlegada = fila.querySelector(".input-llegada");
    const inputRafaga = fila.querySelector(".input-rafaga");
    const inputPrioridad = fila.querySelector(".input-prioridad");

    const id = inputId.value.trim();
    const tiempoLlegada = Number(inputLlegada.value);
    const rafaga = Number(inputRafaga.value);
    const prioridad = inputPrioridad.value === "" ? 0 : Number(inputPrioridad.value);

    // Validar identificador vacío o reservado
    if (!id) {
      inputId.classList.add("input-invalid");
      inputId.focus();
      mostrarError(`Fila ${numFila}: El identificador del proceso no puede estar vacío.`);
      return null;
    }

    if (id.toUpperCase() === "IDLE") {
      inputId.classList.add("input-invalid");
      inputId.focus();
      mostrarError(`Fila ${numFila}: "IDLE" es una palabra reservada para CPU inactiva.`);
      return null;
    }

    // Validar identificadores repetidos (sin distinguir mayúsculas/minúsculas)
    const idNormalizado = id.toLowerCase();
    if (idsVistos.has(idNormalizado)) {
      inputId.classList.add("input-invalid");
      inputId.focus();
      mostrarError(`Fila ${numFila}: El identificador "${id}" está repetido.`);
      return null;
    }
    idsVistos.add(idNormalizado);

    // Validar llegada no negativa y entera
    if (inputLlegada.value === "" || !Number.isInteger(tiempoLlegada) || tiempoLlegada < 0) {
      inputLlegada.classList.add("input-invalid");
      inputLlegada.focus();
      mostrarError(`Fila ${numFila} (${id}): El tiempo de llegada debe ser un entero mayor o igual a 0.`);
      return null;
    }

    // Validar ráfaga > 0 y entera
    if (inputRafaga.value === "" || !Number.isInteger(rafaga) || rafaga <= 0) {
      inputRafaga.classList.add("input-invalid");
      inputRafaga.focus();
      mostrarError(`Fila ${numFila} (${id}): La ráfaga de CPU debe ser un entero mayor que 0.`);
      return null;
    }

    // Validar prioridad entera
    if (!Number.isInteger(prioridad)) {
      inputPrioridad.classList.add("input-invalid");
      inputPrioridad.focus();
      mostrarError(`Fila ${numFila} (${id}): La prioridad debe ser un número entero.`);
      return null;
    }

    procesos.push({
      id,
      tiempoLlegada,
      rafaga,
      prioridad
    });
  }

  return procesos;
}

function construirMapaColores(procesos) {
  const mapa = new Map();
  procesos.forEach((p, idx) => {
    mapa.set(p.id, PALETA_PROCESOS[idx % PALETA_PROCESOS.length]);
  });
  return mapa;
}

/**
 * Renderiza un diagrama de Gantt sobre una escala de tiempo común (`tiempoEscala`).
 * Si el algoritmo termina antes de `tiempoEscala`, agrega un tramo IDLE final
 * para que ambos diagramas compartan exactamente la misma escala y ancho.
 */
function renderizarGanttEnContenedor(chartEl, axisEl, gantt, mapaColores, tiempoEscala) {
  chartEl.innerHTML = "";
  axisEl.innerHTML = "";

  if (!gantt || gantt.length === 0 || tiempoEscala <= 0) return;

  const tramosAjustados = gantt.map((t) => ({ ...t }));
  const ultimoFin = tramosAjustados[tramosAjustados.length - 1].fin;

  if (ultimoFin < tiempoEscala) {
    const ultimoTramo = tramosAjustados[tramosAjustados.length - 1];
    if (ultimoTramo.id === "IDLE") {
      ultimoTramo.fin = tiempoEscala;
    } else {
      tramosAjustados.push({
        id: "IDLE",
        inicio: ultimoFin,
        fin: tiempoEscala
      });
    }
  }

  const anchoMinimoTotal = Math.max(600, tiempoEscala * 38);
  chartEl.style.minWidth = `${anchoMinimoTotal}px`;
  axisEl.style.minWidth = `${anchoMinimoTotal}px`;

  tramosAjustados.forEach((tramo, index) => {
    const duracion = tramo.fin - tramo.inicio;
    const porcentaje = (duracion / tiempoEscala) * 100;

    // Bloque visual
    const bloque = document.createElement("div");
    bloque.className = "gantt-block";
    bloque.style.width = `${porcentaje}%`;
    bloque.title = `${tramo.id}: [${tramo.inicio} - ${tramo.fin}] (Duración: ${duracion})`;

    if (tramo.id === "IDLE") {
      bloque.classList.add("is-idle");
      bloque.innerHTML = `<span>IDLE</span><small>(${duracion})</small>`;
    } else {
      const color = mapaColores.get(tramo.id) || PALETA_PROCESOS[0];
      bloque.style.backgroundColor = color.bg;
      bloque.style.color = color.text;
      bloque.innerHTML = `<span>${tramo.id}</span><small>(${duracion})</small>`;
    }

    chartEl.appendChild(bloque);

    // Eje de tiempo alineado al ancho de cada tramo
    const marca = document.createElement("div");
    marca.className = "gantt-tick";
    marca.style.width = `${porcentaje}%`;

    const spanInicio = document.createElement("span");
    spanInicio.className = "gantt-tick-start";
    spanInicio.textContent = tramo.inicio;
    marca.appendChild(spanInicio);

    if (index === tramosAjustados.length - 1) {
      const spanFin = document.createElement("span");
      spanFin.className = "gantt-tick-end";
      spanFin.textContent = tramo.fin;
      marca.appendChild(spanFin);
    }

    axisEl.appendChild(marca);
  });
}

function renderizarGantt(gantt, mapaColores) {
  const tiempoTotal = gantt.length > 0 ? gantt[gantt.length - 1].fin : 0;
  renderizarGanttEnContenedor(ganttChart, ganttAxis, gantt, mapaColores, tiempoTotal);
}

function renderizarMetricas(metricasPorProceso, promedios) {
  tbodyMetricas.innerHTML = "";
  tfootMetricas.innerHTML = "";

  metricasPorProceso.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${m.id}</strong></td>
      <td>${m.tiempoLlegada}</td>
      <td>${m.rafaga}</td>
      <td>${m.espera}</td>
      <td>${m.retorno}</td>
      <td>${m.respuesta}</td>
    `;
    tbodyMetricas.appendChild(tr);
  });

  const trPromedio = document.createElement("tr");
  trPromedio.innerHTML = `
    <td colspan="3">Promedio general</td>
    <td>${promedios.espera.toFixed(2)}</td>
    <td>${promedios.retorno.toFixed(2)}</td>
    <td>${promedios.respuesta.toFixed(2)}</td>
  `;
  tfootMetricas.appendChild(trPromedio);
}

function renderizarColaListos(colaListosPorInstante, gantt) {
  tbodyCola.innerHTML = "";

  colaListosPorInstante.forEach(({ tiempo, cola }) => {
    const tramoActual = gantt.find((t) => tiempo >= t.inicio && tiempo < t.fin);
    const ejecutando = tramoActual ? tramoActual.id : "IDLE";

    const colaHTML =
      cola.length > 0
        ? cola.map((id) => `<span class="queue-pill">${id}</span>`).join("")
        : `<span class="text-muted">Vacía</span>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>t = ${tiempo}</strong></td>
      <td>${ejecutando === "IDLE" ? '<span class="text-muted">IDLE</span>' : `<strong>${ejecutando}</strong>`}</td>
      <td>${colaHTML}</td>
    `;
    tbodyCola.appendChild(tr);
  });
}

function renderizarTablaComparacionPromedios(resFifo, resSjf) {
  tbodyComparacionPromedios.innerHTML = "";

  const filas = [
    { nombre: "FIFO", promedios: resFifo.promedios },
    { nombre: "SJF (No expropiativo)", promedios: resSjf.promedios }
  ];

  filas.forEach(({ nombre, promedios }) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${nombre}</strong></td>
      <td>${promedios.espera.toFixed(2)}</td>
      <td>${promedios.retorno.toFixed(2)}</td>
      <td>${promedios.respuesta.toFixed(2)}</td>
    `;
    tbodyComparacionPromedios.appendChild(tr);
  });
}

function ejecutarSimulacion() {
  const procesos = leerYValidarProcesos();
  if (!procesos) return;

  const algoritmo = selectAlgoritmo.value;
  const resultado = algoritmo === "SJF" ? sjf(procesos) : fifo(procesos);
  const mapaColores = construirMapaColores(procesos);

  badgeAlgoritmo.textContent =
    algoritmo === "SJF" ? "SJF (No expropiativo)" : "FIFO";

  renderizarGantt(resultado.gantt, mapaColores);
  renderizarMetricas(resultado.metricasPorProceso, resultado.promedios);
  renderizarColaListos(resultado.colaListosPorInstante, resultado.gantt);

  panelComparacion.hidden = true;
  panelResultados.hidden = false;
  panelResultados.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function ejecutarComparacion() {
  const procesos = leerYValidarProcesos();
  if (!procesos) return;

  const resFifo = fifo(procesos);
  const resSjf = sjf(procesos);
  const mapaColores = construirMapaColores(procesos);

  const finFifo = resFifo.gantt.length > 0 ? resFifo.gantt[resFifo.gantt.length - 1].fin : 0;
  const finSjf = resSjf.gantt.length > 0 ? resSjf.gantt[resSjf.gantt.length - 1].fin : 0;
  const escalaComun = Math.max(finFifo, finSjf);

  badgeEscalaComparacion.textContent = `Escala: 0 – ${escalaComun}`;

  renderizarGanttEnContenedor(
    ganttChartFifo,
    ganttAxisFifo,
    resFifo.gantt,
    mapaColores,
    escalaComun
  );
  renderizarGanttEnContenedor(
    ganttChartSjf,
    ganttAxisSjf,
    resSjf.gantt,
    mapaColores,
    escalaComun
  );
  renderizarTablaComparacionPromedios(resFifo, resSjf);

  panelResultados.hidden = true;
  panelComparacion.hidden = false;
  panelComparacion.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function reiniciarSimulador() {
  ocultarError();
  selectAlgoritmo.value = "FIFO";
  cargarProcesosIniciales();

  panelResultados.hidden = true;
  ganttChart.innerHTML = "";
  ganttAxis.innerHTML = "";
  tbodyMetricas.innerHTML = "";
  tfootMetricas.innerHTML = "";
  tbodyCola.innerHTML = "";

  panelComparacion.hidden = true;
  badgeEscalaComparacion.textContent = "";
  ganttChartFifo.innerHTML = "";
  ganttAxisFifo.innerHTML = "";
  ganttChartSjf.innerHTML = "";
  ganttAxisSjf.innerHTML = "";
  tbodyComparacionPromedios.innerHTML = "";
}

// Eventos
btnAgregarFila.addEventListener("click", () => {
  ocultarError();
  crearFilaProceso({
    id: `P${contadorId++}`,
    tiempoLlegada: 0,
    rafaga: 1,
    prioridad: 1
  });
});

btnSimular.addEventListener("click", ejecutarSimulacion);
btnComparar.addEventListener("click", ejecutarComparacion);
btnReiniciar.addEventListener("click", reiniciarSimulador);

// Inicialización al cargar la página
cargarProcesosIniciales();