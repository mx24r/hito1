/**
 * scheduler.js — Lógica de planificación de procesos (sin dependencias).
 *
 * Algoritmos implementados en esta etapa:
 *   - fifo(procesos): First In, First Out (no expropiativo)
 *   - sjf(procesos):  Shortest Job First (no expropiativo)
 *
 * Formato de entrada (cada proceso):
 *   { id: string, llegada: entero >= 0, rafaga: entero >= 1, prioridad: entero }
 *   La prioridad se valida y se conserva, pero todavía no influye en la decisión.
 *
 * Supuestos:
 *   - Tiempo discreto (unidades enteras), comenzando en t = 0.
 *   - El cambio de contexto no consume tiempo.
 *   - Si no hay procesos listos, la CPU queda inactiva (tramo "IDLE").
 *   - Desempate: menor tiempo de llegada; si persiste, el que aparece primero en la lista.
 *
 * Formato de salida:
 *   {
 *     algoritmo: "FIFO" | "SJF",
 *     gantt: [{ id, inicio, fin }],                 // incluye tramos IDLE
 *     colaListos: [{ instante, ejecutando, cola }], // un registro por cada instante 0..fin-1
 *     metricas: [{ id, llegada, rafaga, prioridad, inicio, fin, espera, retorno, respuesta }],
 *     promedios: { espera, retorno, respuesta }     // redondeados a 2 decimales
 *   }
 */
(function (global) {
  "use strict";

  const IDLE = "IDLE";

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------

  function redondear2(x) {
    return Math.round((x + Number.EPSILON) * 100) / 100;
  }

  function promedio(valores) {
    if (valores.length === 0) return 0;
    return redondear2(valores.reduce((a, b) => a + b, 0) / valores.length);
  }

  function esEntero(v) {
    return typeof v === "number" && Number.isInteger(v);
  }

  /**
   * Valida la lista y devuelve copias normalizadas con su índice original
   * (el índice es el último criterio de desempate).
   */
  function normalizar(procesos) {
    if (!Array.isArray(procesos)) {
      throw new TypeError("Se esperaba una lista de procesos.");
    }
    const ids = new Set();
    return procesos.map((p, indice) => {
      const id = String(p.id ?? "").trim();
      if (id === "") throw new Error(`El proceso en la posición ${indice + 1} no tiene identificador.`);
      if (id.toUpperCase() === IDLE) throw new Error(`"${IDLE}" es un identificador reservado.`);
      if (ids.has(id)) throw new Error(`Identificador duplicado: ${id}.`);
      ids.add(id);

      const llegada = Number(p.llegada);
      const rafaga = Number(p.rafaga);
      const prioridad = p.prioridad === undefined || p.prioridad === "" ? 0 : Number(p.prioridad);

      if (!esEntero(llegada) || llegada < 0) throw new Error(`${id}: la llegada debe ser un entero >= 0.`);
      if (!esEntero(rafaga) || rafaga < 1) throw new Error(`${id}: la ráfaga debe ser un entero >= 1.`);
      if (!esEntero(prioridad)) throw new Error(`${id}: la prioridad debe ser un entero.`);

      return { id, llegada, rafaga, prioridad, indice };
    });
  }

  // ---------------------------------------------------------------------------
  // Criterios de selección (comparadores). Menor = se elige antes.
  // ---------------------------------------------------------------------------

  // Desempate común: primero el que llegó antes; luego el que aparece antes en la lista.
  function desempate(a, b) {
    return a.llegada - b.llegada || a.indice - b.indice;
  }

  const criterioFIFO = (a, b) => desempate(a, b);
  const criterioSJF = (a, b) => a.rafaga - b.rafaga || desempate(a, b);

  // ---------------------------------------------------------------------------
  // Motor genérico no expropiativo
  // ---------------------------------------------------------------------------

  /**
   * Simula un planificador no expropiativo: cada vez que la CPU queda libre,
   * ordena los procesos listos con `criterio` y ejecuta el primero hasta terminar.
   */
  function simularNoExpropiativo(procesos, criterio, nombre) {
    const lista = normalizar(procesos);
    const terminado = new Array(lista.length).fill(false);
    const datos = lista.map(() => ({ inicio: null, fin: null }));

    const gantt = [];
    const colaListos = [];
    let t = 0;
    let completados = 0;

    // Procesos que ya llegaron en el instante `instante`, no han terminado
    // y no son el que está en CPU; ordenados según el criterio del algoritmo.
    const listosEn = (instante, enEjecucion) =>
      lista
        .filter((p) => !terminado[p.indice] && p !== enEjecucion && p.llegada <= instante)
        .sort(criterio);

    while (completados < lista.length) {
      const listos = listosEn(t, null);

      // CPU inactiva: avanzar hasta la próxima llegada.
      if (listos.length === 0) {
        const proxima = Math.min(...lista.filter((p) => !terminado[p.indice]).map((p) => p.llegada));
        const ultimo = gantt[gantt.length - 1];
        if (ultimo && ultimo.id === IDLE && ultimo.fin === t) {
          ultimo.fin = proxima; // fusionar con el IDLE anterior
        } else {
          gantt.push({ id: IDLE, inicio: t, fin: proxima });
        }
        for (let k = t; k < proxima; k++) {
          colaListos.push({ instante: k, ejecutando: IDLE, cola: [] });
        }
        t = proxima;
        continue;
      }

      // Seleccionar y ejecutar hasta terminar (no expropiativo).
      const elegido = listos[0];
      const inicio = t;
      const fin = t + elegido.rafaga;

      for (let k = inicio; k < fin; k++) {
        colaListos.push({
          instante: k,
          ejecutando: elegido.id,
          cola: listosEn(k, elegido).map((p) => p.id),
        });
      }

      gantt.push({ id: elegido.id, inicio, fin });
      datos[elegido.indice] = { inicio, fin };
      terminado[elegido.indice] = true;
      completados++;
      t = fin;
    }

    // Métricas por proceso (en el orden original de la lista).
    const metricas = lista.map((p) => {
      const { inicio, fin } = datos[p.indice];
      const retorno = fin - p.llegada;      // turnaround
      const espera = retorno - p.rafaga;    // tiempo total en la cola de listos
      const respuesta = inicio - p.llegada; // hasta su primer uso de CPU
      return {
        id: p.id,
        llegada: p.llegada,
        rafaga: p.rafaga,
        prioridad: p.prioridad,
        inicio,
        fin,
        espera,
        retorno,
        respuesta,
      };
    });

    const promedios = {
      espera: promedio(metricas.map((m) => m.espera)),
      retorno: promedio(metricas.map((m) => m.retorno)),
      respuesta: promedio(metricas.map((m) => m.respuesta)),
    };

    return { algoritmo: nombre, gantt, colaListos, metricas, promedios };
  }

  // ---------------------------------------------------------------------------
  // API pública
  // ---------------------------------------------------------------------------

  /** FIFO: atiende en orden de llegada. */
  function fifo(procesos) {
    return simularNoExpropiativo(procesos, criterioFIFO, "FIFO");
  }

  /** SJF no expropiativo: entre los listos, la ráfaga más corta. */
  function sjf(procesos) {
    return simularNoExpropiativo(procesos, criterioSJF, "SJF");
  }

  const Scheduler = { fifo, sjf, IDLE };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = Scheduler; // Node (pruebas)
  } else {
    global.Scheduler = Scheduler; // Navegador: window.Scheduler
  }
})(typeof window !== "undefined" ? window : globalThis);
