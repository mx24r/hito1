// ui.js

document.addEventListener("DOMContentLoaded", () => {

    // ==============================
    // Referencias al DOM
    // ==============================

    const processForm = document.getElementById("processForm");
    const processIdInput = document.getElementById("processId");
    const arrivalInput = document.getElementById("arrivalTime");
    const burstInput = document.getElementById("burstTime");
    const priorityInput = document.getElementById("priority");

    const saveProcessBtn = document.getElementById("saveProcessBtn");
    const cancelEditBtn = document.getElementById("cancelEditBtn");

    const processTableBody = document.getElementById("processTableBody");
    const emptyProcesses = document.getElementById("emptyProcesses");
    const processCount = document.getElementById("processCount");

    const formMessage = document.getElementById("formMessage");
    const simulationMessage = document.getElementById("simulationMessage");

    const algorithmSelect = document.getElementById("algorithm");
    const simulateBtn = document.getElementById("simulateBtn");
    const compareBtn = document.getElementById("compareBtn");
    const resetBtn = document.getElementById("resetBtn");

    const ganttContainer = document.getElementById("ganttContainer");
    const readyQueueContainer = document.getElementById("readyQueueContainer");
    const metricsContainer = document.getElementById("metricsContainer");

    const comparisonSection = document.getElementById("comparisonSection");
    const comparisonFifoGantt = document.getElementById("comparisonFifoGantt");
    const comparisonSjfGantt = document.getElementById("comparisonSjfGantt");
    const comparisonMetrics = document.getElementById("comparisonMetrics");

    // ==============================
    // Estado
    // ==============================

    let procesos = [];
    let indiceEdicion = null;

    // ==============================
    // Utilidades de seguridad
    // ==============================

    function escaparHTML(valor) {
        return String(valor)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // ==============================
    // Mensajes
    // ==============================

    function mostrarMensaje(elemento, texto, tipo = "info") {
        elemento.textContent = texto;
        elemento.className = `message ${tipo}`;
    }

    function ocultarMensaje(elemento) {
        elemento.className = "message hidden";
        elemento.textContent = "";
    }

    function mostrarMensajeFormulario(texto, tipo = "error") {
        mostrarMensaje(formMessage, texto, tipo);
    }

    function mostrarMensajeSimulacion(texto, tipo = "info") {
        mostrarMensaje(simulationMessage, texto, tipo);
    }

    // ==============================
    // Limpiar interfaz
    // ==============================

    function limpiarFormulario() {
        processForm.reset();

        priorityInput.value = "0";

        indiceEdicion = null;

        saveProcessBtn.textContent = "Agregar proceso";
        cancelEditBtn.classList.add("hidden");

        processIdInput.focus();
    }

    function limpiarResultados() {
        ganttContainer.innerHTML = `
            <div class="empty-state">
                Ejecuta una simulación para visualizar el diagrama de Gantt.
            </div>
        `;

        readyQueueContainer.innerHTML = `
            <div class="empty-state">
                La cola de listos aparecerá después de la simulación.
            </div>
        `;

        metricsContainer.innerHTML = `
            <div class="empty-state">
                Las métricas aparecerán después de la simulación.
            </div>
        `;

        ocultarMensaje(simulationMessage);
        limpiarComparacion();
    }

    function limpiarComparacion() {
        comparisonSection.classList.add("hidden");

        comparisonFifoGantt.innerHTML = "";
        comparisonSjfGantt.innerHTML = "";

        comparisonMetrics.innerHTML = `
            <div class="empty-state">
                Ejecuta la comparación para ver los promedios.
            </div>
        `;
    }

    function invalidarSimulacion() {
        limpiarResultados();
    }

    // ==============================
    // Validación
    // ==============================

    function validarFormulario() {
        const id = processIdInput.value.trim();
        const llegadaTexto = arrivalInput.value;
        const rafagaTexto = burstInput.value;
        const prioridadTexto = priorityInput.value;

        const llegada = Number(llegadaTexto);
        const rafaga = Number(rafagaTexto);
        const prioridad = Number(prioridadTexto);

        if (id === "") {
            return {
                valido: false,
                mensaje: "El identificador no puede estar vacío."
            };
        }

        // Identificadores duplicados, sin distinguir mayúsculas.
        const idDuplicado = procesos.some((p, indice) => {
            if (indice === indiceEdicion) {
                return false;
            }

            return p.id.toLowerCase() === id.toLowerCase();
        });

        if (idDuplicado) {
            return {
                valido: false,
                mensaje: "Ya existe un proceso con ese identificador."
            };
        }

        if (
            llegadaTexto === "" ||
            !Number.isInteger(llegada) ||
            llegada < 0
        ) {
            return {
                valido: false,
                mensaje: "El tiempo de llegada debe ser un entero mayor o igual a 0."
            };
        }

        if (
            rafagaTexto === "" ||
            !Number.isInteger(rafaga) ||
            rafaga <= 0
        ) {
            return {
                valido: false,
                mensaje: "La ráfaga debe ser un entero mayor que 0."
            };
        }

        if (
            prioridadTexto === "" ||
            !Number.isFinite(prioridad)
        ) {
            return {
                valido: false,
                mensaje: "La prioridad debe ser un valor numérico."
            };
        }

        return {
            valido: true,
            proceso: {
                id,
                llegada,
                rafaga,
                prioridad
            }
        };
    }

    // ==============================
    // Agregar / editar
    // ==============================

    processForm.addEventListener("submit", (event) => {
        event.preventDefault();

        ocultarMensaje(formMessage);

        const validacion = validarFormulario();

        if (!validacion.valido) {
            mostrarMensajeFormulario(validacion.mensaje);
            return;
        }

        const nuevoProceso = validacion.proceso;

        if (indiceEdicion === null) {
            procesos.push(nuevoProceso);

            mostrarMensajeFormulario(
                `Proceso ${nuevoProceso.id} agregado correctamente.`,
                "success"
            );
        } else {
            procesos[indiceEdicion] = nuevoProceso;

            mostrarMensajeFormulario(
                `Proceso ${nuevoProceso.id} actualizado correctamente.`,
                "success"
            );
        }

        renderizarProcesos();
        invalidarSimulacion();
        limpiarFormulario();
    });

    // ==============================
    // Cancelar edición
    // ==============================

    cancelEditBtn.addEventListener("click", () => {
        limpiarFormulario();
        ocultarMensaje(formMessage);
    });

    // ==============================
    // Tabla de procesos
    // ==============================

    function renderizarProcesos() {
        processTableBody.innerHTML = "";

        procesos.forEach((proceso, indice) => {
            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td>${escaparHTML(proceso.id)}</td>
                <td>${proceso.llegada}</td>
                <td>${proceso.rafaga}</td>
                <td>${proceso.prioridad}</td>
                <td>
                    <div class="table-actions">
                        <button
                            type="button"
                            class="btn btn-small edit-btn"
                            data-action="edit"
                            data-index="${indice}"
                        >
                            Editar
                        </button>

                        <button
                            type="button"
                            class="btn btn-small delete-btn"
                            data-action="delete"
                            data-index="${indice}"
                        >
                            Eliminar
                        </button>
                    </div>
                </td>
            `;

            processTableBody.appendChild(fila);
        });

        emptyProcesses.classList.toggle(
            "hidden",
            procesos.length > 0
        );

        processCount.textContent =
            `${procesos.length} ${procesos.length === 1 ? "proceso" : "procesos"}`;
    }

    // ==============================
    // Acciones de la tabla
    // ==============================

    processTableBody.addEventListener("click", (event) => {
        const boton = event.target.closest("button[data-action]");

        if (!boton) {
            return;
        }

        const accion = boton.dataset.action;
        const indice = Number(boton.dataset.index);

        if (!Number.isInteger(indice) || !procesos[indice]) {
            return;
        }

        if (accion === "edit") {
            editarProceso(indice);
        }

        if (accion === "delete") {
            eliminarProceso(indice);
        }
    });

    // ==============================
    // Editar proceso
    // ==============================

    function editarProceso(indice) {
        const proceso = procesos[indice];

        processIdInput.value = proceso.id;
        arrivalInput.value = proceso.llegada;
        burstInput.value = proceso.rafaga;
        priorityInput.value = proceso.prioridad;

        indiceEdicion = indice;

        saveProcessBtn.textContent = "Guardar cambios";
        cancelEditBtn.classList.remove("hidden");

        ocultarMensaje(formMessage);

        processIdInput.focus();

        processForm.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    // ==============================
    // Eliminar proceso
    // ==============================

    function eliminarProceso(indice) {
        const proceso = procesos[indice];

        const confirmar = window.confirm(
            `¿Deseas eliminar el proceso ${proceso.id}?`
        );

        if (!confirmar) {
            return;
        }

        procesos.splice(indice, 1);

        if (indiceEdicion === indice) {
            limpiarFormulario();
        } else if (
            indiceEdicion !== null &&
            indiceEdicion > indice
        ) {
            indiceEdicion--;
        }

        renderizarProcesos();
        invalidarSimulacion();

        mostrarMensajeFormulario(
            `Proceso ${proceso.id} eliminado.`,
            "success"
        );
    }

    // ==============================
    // Simulación individual
    // ==============================

    simulateBtn.addEventListener("click", () => {
        ocultarMensaje(simulationMessage);
        limpiarComparacion();

        if (procesos.length === 0) {
            mostrarMensajeSimulacion(
                "Agrega al menos un proceso antes de simular.",
                "error"
            );
            return;
        }

        try {
            const algoritmo = algorithmSelect.value;

            let resultado;

            if (algoritmo === "fifo") {
                resultado = Scheduler.fifo(procesos);
            } else if (algoritmo === "sjf") {
                resultado = Scheduler.sjf(procesos);
            } else {
                throw new Error("Algoritmo desconocido.");
            }

            renderizarGantt(
                ganttContainer,
                resultado.gantt
            );

            renderizarColaListos(resultado.colaListos);
            renderizarMetricas(resultado);

            const nombreAlgoritmo =
                algoritmo === "fifo" ? "FIFO" : "SJF";

            mostrarMensajeSimulacion(
                `Simulación ${nombreAlgoritmo} completada correctamente.`,
                "success"
            );

        } catch (error) {
            console.error(error);

            mostrarMensajeSimulacion(
                error.message || "Ocurrió un error durante la simulación.",
                "error"
            );
        }
    });

    // ==============================
    // Comparar FIFO y SJF
    // ==============================

    compareBtn.addEventListener("click", () => {
        ocultarMensaje(simulationMessage);

        if (procesos.length === 0) {
            mostrarMensajeSimulacion(
                "Agrega al menos un proceso antes de comparar.",
                "error"
            );
            return;
        }

        try {
            // Ejecutar ambos algoritmos con los mismos procesos.
            const resultadoFIFO = Scheduler.fifo(procesos);
            const resultadoSJF = Scheduler.sjf(procesos);

            renderizarComparacion(
                resultadoFIFO,
                resultadoSJF
            );

            mostrarMensajeSimulacion(
                "Comparación FIFO y SJF completada correctamente.",
                "success"
            );

            comparisonSection.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        } catch (error) {
            console.error(error);

            mostrarMensajeSimulacion(
                error.message || "Ocurrió un error al comparar los algoritmos.",
                "error"
            );
        }
    });

    // ==============================
    // Renderizar comparación
    // ==============================

    function renderizarComparacion(resultadoFIFO, resultadoSJF) {
        const finFIFO = obtenerFinGantt(resultadoFIFO.gantt);
        const finSJF = obtenerFinGantt(resultadoSJF.gantt);

        // Escala común: el mayor tiempo final de ambos algoritmos.
        const escalaComun = Math.max(finFIFO, finSJF);

        // Reunir todos los tiempos relevantes de ambos Gantt.
        const tiemposComunes = [
            0,
            escalaComun,
            ...resultadoFIFO.gantt.flatMap(tramo => [
                tramo.inicio,
                tramo.fin
            ]),
            ...resultadoSJF.gantt.flatMap(tramo => [
                tramo.inicio,
                tramo.fin
            ])
        ];

        const ejeComun = [...new Set(tiemposComunes)]
            .filter(t => t >= 0 && t <= escalaComun)
            .sort((a, b) => a - b);

        renderizarGantt(
            comparisonFifoGantt,
            resultadoFIFO.gantt,
            escalaComun,
            ejeComun
        );

        renderizarGantt(
            comparisonSjfGantt,
            resultadoSJF.gantt,
            escalaComun,
            ejeComun
        );

        renderizarMetricasComparacion(
            resultadoFIFO,
            resultadoSJF
        );

        comparisonSection.classList.remove("hidden");
    }

    function obtenerFinGantt(gantt) {
        if (!gantt || gantt.length === 0) {
            return 0;
        }

        return Math.max(...gantt.map(tramo => tramo.fin));
    }

    // ==============================
    // Renderizar Gantt
    // ==============================

    /**
     * Renderiza un diagrama de Gantt.
     *
     * escalaFinal:
     * - Si no se especifica, usa el tiempo final del algoritmo.
     * - Si se especifica, permite utilizar la misma escala
     *   para comparar algoritmos.
     *
     * tiemposEje:
     * - Si se especifica, usa los mismos puntos del eje
     *   para ambos diagramas de comparación.
     */
    function renderizarGantt(
        contenedor,
        gantt,
        escalaFinal = null,
        tiemposEje = null
    ) {
        if (!gantt || gantt.length === 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    No hay tramos de ejecución para mostrar.
                </div>
            `;
            return;
        }

        const finGantt = obtenerFinGantt(gantt);

        const tiempoFinal =
            escalaFinal !== null ? escalaFinal : finGantt;

        if (tiempoFinal <= 0) {
            contenedor.innerHTML = `
                <div class="empty-state">
                    No existe duración válida para el diagrama.
                </div>
            `;
            return;
        }

        const duracionTotal = tiempoFinal;

        const segmentosHTML = gantt.map(tramo => {
            const duracion = tramo.fin - tramo.inicio;
            const esIdle = tramo.id === "IDLE";

            return `
                <div
                    class="gantt-segment ${esIdle ? "idle" : "process"}"
                    style="flex: ${duracion} 0 0%;"
                    title="${escaparHTML(tramo.id)}: ${tramo.inicio} - ${tramo.fin} (${duracion} unidades)"
                >
                    ${escaparHTML(tramo.id)}
                </div>
            `;
        }).join("");

        /*
         * Completar el diagrama con espacio vacío si el algoritmo
         * termina antes que el otro. Este espacio no representa IDLE:
         * solo permite mantener una escala común de comparación.
         */
        const espacioRestante = tiempoFinal - finGantt;

        const rellenoHTML = espacioRestante > 0
            ? `
                <div
                    class="gantt-segment timeline-padding"
                    style="flex: ${espacioRestante} 0 0%;"
                    aria-hidden="true"
                ></div>
            `
            : "";

        const tiempos = tiemposEje || [
            ...new Set([
                0,
                ...gantt.flatMap(tramo => [
                    tramo.inicio,
                    tramo.fin
                ])
            ])
        ].sort((a, b) => a - b);

        const ejeHTML = tiempos.map((tiempo, indice) => {
            const posicion =
                (tiempo / duracionTotal) * 100;

            let clase = "";

            if (indice === 0) {
                clase = "first";
            } else if (indice === tiempos.length - 1) {
                clase = "last";
            }

            return `
                <span
                    class="gantt-tick ${clase}"
                    style="left: ${posicion}%"
                >
                    ${tiempo}
                </span>
            `;
        }).join("");

        contenedor.innerHTML = `
            <div class="gantt-scroll">
                <div class="gantt-inner">
                    <div class="gantt-track">
                        ${segmentosHTML}
                        ${rellenoHTML}
                    </div>

                    <div class="gantt-axis">
                        ${ejeHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // ==============================
    // Cola de listos
    // ==============================

    function renderizarColaListos(colaListos) {
        if (!colaListos || colaListos.length === 0) {
            readyQueueContainer.innerHTML = `
                <div class="empty-state">
                    No hay registros de la cola de listos.
                </div>
            `;
            return;
        }

        const filasHTML = colaListos.map(estado => {
            let procesosHTML;

            if (estado.cola.length === 0) {
                procesosHTML = `
                    <span class="queue-empty">
                        Cola vacía
                    </span>
                `;
            } else {
                procesosHTML = estado.cola.map(id => `
                    <span class="queue-process">
                        ${escaparHTML(id)}
                    </span>
                `).join("");
            }

            return `
                <tr>
                    <td>${estado.tiempo}</td>
                    <td>${procesosHTML}</td>
                </tr>
            `;
        }).join("");

        readyQueueContainer.innerHTML = `
            <table class="queue-table">
                <thead>
                    <tr>
                        <th>Instante</th>
                        <th>Procesos listos en espera</th>
                    </tr>
                </thead>
                <tbody>
                    ${filasHTML}
                </tbody>
            </table>
        `;
    }

    // ==============================
    // Métricas individuales
    // ==============================

    function renderizarMetricas(resultado) {
        const filasHTML = resultado.procesos.map(proceso => {
            return `
                <tr>
                    <td>${escaparHTML(proceso.id)}</td>
                    <td>${proceso.llegada}</td>
                    <td>${proceso.rafaga}</td>
                    <td>${proceso.inicio}</td>
                    <td>${proceso.fin}</td>
                    <td>${proceso.espera}</td>
                    <td>${proceso.retorno}</td>
                    <td>${proceso.respuesta}</td>
                </tr>
            `;
        }).join("");

        const promedios = resultado.promedios;

        metricsContainer.innerHTML = `
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>Proceso</th>
                        <th>Llegada</th>
                        <th>Ráfaga</th>
                        <th>Inicio</th>
                        <th>Fin</th>
                        <th>Espera</th>
                        <th>Retorno</th>
                        <th>Respuesta</th>
                    </tr>
                </thead>

                <tbody>
                    ${filasHTML}

                    <tr class="average-row">
                        <td colspan="5">Promedios</td>
                        <td>${promedios.espera}</td>
                        <td>${promedios.retorno}</td>
                        <td>${promedios.respuesta}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // ==============================
    // Tabla comparativa de promedios
    // ==============================

    function renderizarMetricasComparacion(resultadoFIFO, resultadoSJF) {
        const fifo = resultadoFIFO.promedios;
        const sjf = resultadoSJF.promedios;

        comparisonMetrics.innerHTML = `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Algoritmo</th>
                        <th>Promedio de espera</th>
                        <th>Promedio de retorno</th>
                        <th>Promedio de respuesta</th>
                    </tr>
                </thead>

                <tbody>
                    <tr class="fifo-row">
                        <td><strong>FIFO</strong></td>
                        <td>${fifo.espera}</td>
                        <td>${fifo.retorno}</td>
                        <td>${fifo.respuesta}</td>
                    </tr>

                    <tr class="sjf-row">
                        <td><strong>SJF</strong></td>
                        <td>${sjf.espera}</td>
                        <td>${sjf.retorno}</td>
                        <td>${sjf.respuesta}</td>
                    </tr>
                </tbody>
            </table>
        `;
    }

    // ==============================
    // Reiniciar
    // ==============================

    resetBtn.addEventListener("click", () => {
        const confirmar = window.confirm(
            "¿Deseas reiniciar el simulador? Se eliminarán todos los procesos y resultados."
        );

        if (!confirmar) {
            return;
        }

        procesos = [];

        limpiarFormulario();
        renderizarProcesos();
        limpiarResultados();

        algorithmSelect.value = "fifo";

        ocultarMensaje(formMessage);

        mostrarMensajeSimulacion(
            "Simulador reiniciado correctamente.",
            "success"
        );
    });

    // ==============================
    // Inicialización
    // ==============================

    renderizarProcesos();
    limpiarResultados();

});