/**
 * Módulo de planificación de procesos (tiempo discreto, sin cambio de contexto).
 * Cada proceso de entrada espera: { id, tiempoLlegada, rafaga, prioridad }
 */

function normalizarProcesos(procesos) {
  return procesos.map((p, indice) => ({
    id: String(p.id),
    tiempoLlegada: Number(p.tiempoLlegada),
    rafaga: Number(p.rafaga),
    prioridad: p.prioridad !== undefined ? Number(p.prioridad) : 0,
    indiceOriginal: indice,
    completado: false
  }));
}

function compararFIFO(a, b) {
  if (a.tiempoLlegada !== b.tiempoLlegada) {
    return a.tiempoLlegada - b.tiempoLlegada;
  }
  return a.indiceOriginal - b.indiceOriginal;
}

function compararSJF(a, b) {
  if (a.rafaga !== b.rafaga) {
    return a.rafaga - b.rafaga;
  }
  if (a.tiempoLlegada !== b.tiempoLlegada) {
    return a.tiempoLlegada - b.tiempoLlegada;
  }
  return a.indiceOriginal - b.indiceOriginal;
}

function redondear2(valor) {
  return Number(valor.toFixed(2));
}

function ejecutarPlanificacion(procesosEntrada, criterioSeleccion) {
  if (!Array.isArray(procesosEntrada) || procesosEntrada.length === 0) {
    return {
      gantt: [],
      colaListosPorInstante: [],
      metricasPorProceso: [],
      promedios: {
        espera: 0,
        retorno: 0,
        respuesta: 0
      }
    };
  }

  const procesos = normalizarProcesos(procesosEntrada);
  const totalProcesos = procesos.length;
  let completados = 0;
  let tiempoActual = 0;

  const gantt = [];
  const colaListosPorInstante = [];
  const metricasMap = new Map();

  while (completados < totalProcesos) {
    // Procesos que ya llegaron y aún no terminan
    const disponibles = procesos
      .filter((p) => !p.completado && p.tiempoLlegada <= tiempoActual)
      .sort(criterioSeleccion);

    if (disponibles.length === 0) {
      // No hay procesos listos: avanzar 1 unidad en estado IDLE
      colaListosPorInstante.push({
        tiempo: tiempoActual,
        cola: []
      });

      const ultimoTramo = gantt[gantt.length - 1];
      if (ultimoTramo && ultimoTramo.id === "IDLE") {
        ultimoTramo.fin += 1;
      } else {
        gantt.push({
          id: "IDLE",
          inicio: tiempoActual,
          fin: tiempoActual + 1
        });
      }

      tiempoActual += 1;
      continue;
    }

    // Seleccionar el siguiente proceso a ejecutar (no expropiativo)
    const elegido = disponibles[0];
    const inicio = tiempoActual;
    const fin = inicio + elegido.rafaga;

    // Registrar la cola de listos en cada instante discreto que dura la ráfaga
    for (let t = inicio; t < fin; t++) {
      const enEsperaEnT = procesos
        .filter((p) => !p.completado && p.id !== elegido.id && p.tiempoLlegada <= t)
        .sort(criterioSeleccion)
        .map((p) => p.id);

      colaListosPorInstante.push({
        tiempo: t,
        cola: enEsperaEnT
      });
    }

    // Registrar tramo en el diagrama de Gantt
    gantt.push({
      id: elegido.id,
      inicio,
      fin
    });

    // Calcular métricas del proceso (en no expropiativo, espera === respuesta)
    const tiempoRespuesta = inicio - elegido.tiempoLlegada;
    const tiempoRetorno = fin - elegido.tiempoLlegada;
    const tiempoEspera = tiempoRetorno - elegido.rafaga;

    metricasMap.set(elegido.indiceOriginal, {
      id: elegido.id,
      tiempoLlegada: elegido.tiempoLlegada,
      rafaga: elegido.rafaga,
      prioridad: elegido.prioridad,
      inicio,
      fin,
      espera: tiempoEspera,
      retorno: tiempoRetorno,
      respuesta: tiempoRespuesta
    });

    elegido.completado = true;
    completados += 1;
    tiempoActual = fin;
  }

  // Conservar el orden de entrada de los procesos para la tabla de resultados
  const metricasPorProceso = procesos.map((p) => metricasMap.get(p.indiceOriginal));

  const suma = metricasPorProceso.reduce(
    (acc, m) => {
      acc.espera += m.espera;
      acc.retorno += m.retorno;
      acc.respuesta += m.respuesta;
      return acc;
    },
    { espera: 0, retorno: 0, respuesta: 0 }
  );

  const promedios = {
    espera: redondear2(suma.espera / totalProcesos),
    retorno: redondear2(suma.retorno / totalProcesos),
    respuesta: redondear2(suma.respuesta / totalProcesos)
  };

  return {
    gantt,
    colaListosPorInstante,
    metricasPorProceso,
    promedios
  };
}

export function fifo(procesos) {
  return ejecutarPlanificacion(procesos, compararFIFO);
}

export function sjf(procesos) {
  return ejecutarPlanificacion(procesos, compararSJF);
}