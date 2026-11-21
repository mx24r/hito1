// scheduler.js

/**
 * Simulador de planificación de procesos.
 * Algoritmos implementados:
 * - FIFO (First In, First Out)
 * - SJF (Shortest Job First) no expropiativo
 *
 * Cada proceso debe tener:
 * {
 *   id: "P1",
 *   llegada: 0,
 *   rafaga: 5,
 *   prioridad: 1
 * }
 */

const Scheduler = (() => {

    /**
     * Valida y prepara una copia de los procesos.
     * No modifica el arreglo original.
     */
    function validarProcesos(procesos) {
        if (!Array.isArray(procesos)) {
            throw new Error("La entrada debe ser una lista de procesos.");
        }

        const ids = new Set();

        return procesos.map((p, indice) => {
            if (!p || typeof p !== "object") {
                throw new Error(`El proceso en la posición ${indice} no es válido.`);
            }

            if (p.id === undefined || p.id === null || String(p.id).trim() === "") {
                throw new Error(`El proceso en la posición ${indice} no tiene identificador.`);
            }

            const id = String(p.id);

            if (ids.has(id)) {
                throw new Error(`El identificador ${id} está repetido.`);
            }

            ids.add(id);

            const llegada = Number(p.llegada);
            const rafaga = Number(p.rafaga);
            const prioridad = Number(p.prioridad ?? 0);

            if (!Number.isFinite(llegada) || llegada < 0 || !Number.isInteger(llegada)) {
                throw new Error(`La llegada de ${id} debe ser un entero no negativo.`);
            }

            if (!Number.isFinite(rafaga) || rafaga <= 0 || !Number.isInteger(rafaga)) {
                throw new Error(`La ráfaga de ${id} debe ser un entero positivo.`);
            }

            if (!Number.isFinite(prioridad)) {
                throw new Error(`La prioridad de ${id} debe ser numérica.`);
            }

            return {
                id,
                llegada,
                rafaga,
                prioridad,
                indiceOriginal: indice,
                inicioEjecucion: null,
                finEjecucion: null
            };
        });
    }

    /**
     * Orden de desempate común:
     * 1. Tiempo de llegada más bajo.
     * 2. Posición original en la lista.
     */
    function compararLlegada(a, b) {
        if (a.llegada !== b.llegada) {
            return a.llegada - b.llegada;
        }

        return a.indiceOriginal - b.indiceOriginal;
    }

    /**
     * Selección del próximo proceso para FIFO.
     */
    function seleccionarFIFO(listos) {
        return [...listos].sort(compararLlegada)[0];
    }

    /**
     * Selección del próximo proceso para SJF.
     * 1. Ráfaga más corta.
     * 2. Llegada más temprana.
     * 3. Posición original en la lista.
     */
    function seleccionarSJF(listos) {
        return [...listos].sort((a, b) => {
            if (a.rafaga !== b.rafaga) {
                return a.rafaga - b.rafaga;
            }

            return compararLlegada(a, b);
        })[0];
    }

    /**
     * Simulación general.
     * El algoritmo de selección se recibe como parámetro.
     */
    function simular(procesos, seleccionar) {
        const lista = validarProcesos(procesos);

        const gantt = [];
        const colaListos = [];
        const resultados = [];

        const completados = new Set();

        let tiempo = 0;
        let ultimaInstantanea = -1;

        /**
         * Registra el estado de la cola de listos en un instante.
         *
         * La cola incluye los procesos que ya llegaron,
         * que todavía no han terminado y que no están ejecutándose.
         */
        function registrarCola(instante, procesoEjecutando = null) {
            if (instante === ultimaInstantanea) {
                return;
            }

            const cola = lista
                .filter(p =>
                    p.llegada <= instante &&
                    !completados.has(p.id) &&
                    p.id !== procesoEjecutando
                )
                .sort(compararLlegada)
                .map(p => p.id);

            colaListos.push({
                tiempo: instante,
                cola: cola
            });

            ultimaInstantanea = instante;
        }

        /**
         * Agrega un tramo al Gantt.
         * Los tramos consecutivos de IDLE se fusionan.
         */
        function agregarTramo(id, inicio, fin) {
            if (inicio >= fin) {
                return;
            }

            const ultimo = gantt[gantt.length - 1];

            if (
                ultimo &&
                ultimo.id === id &&
                ultimo.fin === inicio
            ) {
                ultimo.fin = fin;
            } else {
                gantt.push({
                    id,
                    inicio,
                    fin
                });
            }
        }

        while (completados.size < lista.length) {

            // Procesos que han llegado y aún no han terminado.
            const disponibles = lista.filter(p =>
                p.llegada <= tiempo &&
                !completados.has(p.id)
            );

            // Si no hay procesos disponibles, la CPU queda inactiva.
            if (disponibles.length === 0) {

                const siguienteLlegada = Math.min(
                    ...lista
                        .filter(p => !completados.has(p.id))
                        .map(p => p.llegada)
                );

                registrarCola(tiempo);

                agregarTramo("IDLE", tiempo, siguienteLlegada);

                // Registrar los estados de la cola durante la inactividad.
                for (let t = tiempo + 1; t <= siguienteLlegada; t++) {
                    registrarCola(t);
                }

                tiempo = siguienteLlegada;
                continue;
            }

            // Estado de la cola antes de seleccionar el siguiente proceso.
            registrarCola(tiempo);

            // Selección según FIFO o SJF.
            const proceso = seleccionar(disponibles);

            const inicio = tiempo;
            const fin = inicio + proceso.rafaga;

            // El proceso comienza su ejecución.
            proceso.inicioEjecucion = inicio;
            proceso.finEjecucion = fin;

            agregarTramo(proceso.id, inicio, fin);

            // El proceso ocupa la CPU durante toda su ráfaga.
            // No hay expropiación.
            for (let t = inicio + 1; t <= fin; t++) {
                registrarCola(t, t < fin ? proceso.id : null);
            }

            tiempo = fin;

            // El proceso termina.
            completados.add(proceso.id);

            const espera = inicio - proceso.llegada;
            const retorno = fin - proceso.llegada;
            const respuesta = inicio - proceso.llegada;

            resultados.push({
                id: proceso.id,
                llegada: proceso.llegada,
                rafaga: proceso.rafaga,
                prioridad: proceso.prioridad,
                inicio: inicio,
                fin: fin,
                espera: espera,
                retorno: retorno,
                respuesta: respuesta
            });
        }

        // Ordenar los resultados por el orden original de los procesos.
        resultados.sort((a, b) => {
            const indiceA = lista.findIndex(p => p.id === a.id);
            const indiceB = lista.findIndex(p => p.id === b.id);

            return indiceA - indiceB;
        });

        /**
         * Calcula promedio con dos decimales.
         * Si no hay procesos, devuelve 0.00.
         */
        function promedio(campo) {
            if (resultados.length === 0) {
                return "0.00";
            }

            const total = resultados.reduce(
                (suma, p) => suma + p[campo],
                0
            );

            return (total / resultados.length).toFixed(2);
        }

        const promedios = {
            espera: promedio("espera"),
            retorno: promedio("retorno"),
            respuesta: promedio("respuesta")
        };

        return {
            gantt,
            colaListos,
            procesos: resultados,
            promedios
        };
    }

    /**
     * FIFO: First In, First Out.
     */
    function fifo(procesos) {
        return simular(procesos, seleccionarFIFO);
    }

    /**
     * SJF: Shortest Job First no expropiativo.
     */
    function sjf(procesos) {
        return simular(procesos, seleccionarSJF);
    }

    // API pública del módulo.
    return {
        fifo,
        sjf
    };

})();

// Exportación para navegador y Node.js.
if (typeof module !== "undefined" && module.exports) {
    module.exports = Scheduler;
}


/*
 * Exposición global para que otros archivos del navegador,
 * como tests.html y ui.js, puedan acceder a Scheduler.fifo() y Scheduler.sjf().
 */
if (typeof window !== "undefined") {
    window.Scheduler = Scheduler;
}