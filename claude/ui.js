/**
 * ui.js — Interfaz del simulador. Toda la lógica de planificación vive en
 * scheduler.js (window.Scheduler); este archivo solo gestiona datos de entrada,
 * validación y la presentación de resultados.
 */
(function () {
  "use strict";

  if (!window.Scheduler) {
    throw new Error("scheduler.js debe cargarse antes que ui.js.");
  }
  const { IDLE } = window.Scheduler;

  // ---------------------------------------------------------------------------
  // Estado
  // ---------------------------------------------------------------------------

  const estado = {
    procesos: [],      // [{ id, llegada, rafaga, prioridad }]
    editando: null,    // índice del proceso en edición, o null
  };

  const EJEMPLO = [
    { id: "P1", llegada: 2, rafaga: 6, prioridad: 1 },
    { id: "P2", llegada: 3, rafaga: 2, prioridad: 2 },
    { id: "P3", llegada: 3, rafaga: 2, prioridad: 3 },
    { id: "P4", llegada: 4, rafaga: 1, prioridad: 1 },
    { id: "P5", llegada: 20, rafaga: 3, prioridad: 1 },
  ];

  const DESCRIPCIONES = {
    fifo: "FIFO atiende los procesos en orden de llegada. Si dos llegan al mismo tiempo, va primero el que aparece antes en la lista. Cada proceso se ejecuta hasta terminar.",
    sjf: "SJF no expropiativo elige, entre los procesos listos, el de ráfaga más corta. Si hay empate, va el que llegó primero y, si persiste, el que aparece antes en la lista. Cada proceso se ejecuta hasta terminar.",
  };

  // Colores oscuros para que el texto blanco tenga contraste ≥ 4.5:1.
  const PALETA = [
    "#1d4ed8", "#b91c1c", "#047857", "#6d28d9", "#b45309",
    "#0e7490", "#be185d", "#4d7c0f", "#9a3412", "#1e3a8a",
    "#7e22ce", "#0f766e",
  ];

  // ---------------------------------------------------------------------------
  // Referencias al DOM
  // ---------------------------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  const ui = {
    form: $("form-proceso"),
    leyendaForm: $("leyenda-form"),
    campos: {
      id: $("campo-id"),
      llegada: $("campo-llegada"),
      rafaga: $("campo-rafaga"),
      prioridad: $("campo-prioridad"),
    },
    errores: {
      id: $("error-id"),
      llegada: $("error-llegada"),
      rafaga: $("error-rafaga"),
      prioridad: $("error-prioridad"),
    },
    btnGuardar: $("btn-guardar"),
    btnCancelar: $("btn-cancelar"),
    btnEjemplo: $("btn-ejemplo"),
    cuerpoProcesos: $("cuerpo-procesos"),
    tablaProcesos: $("tabla-procesos"),
    sinProcesos: $("sin-procesos"),

    algoritmo: $("algoritmo"),
    descripcion: $("descripcion-algoritmo"),
    btnSimular: $("btn-simular"),
    btnComparar: $("btn-comparar"),
    btnReiniciar: $("btn-reiniciar"),
    estado: $("estado"),

    resultados: $("resultados"),
    resumenGantt: $("resumen-gantt"),
    ganttContenedor: $("gantt-contenedor"),
    leyenda: $("leyenda"),
    cuerpoMetricas: $("cuerpo-metricas"),
    pieMetricas: $("pie-metricas"),
    cuerpoCola: $("cuerpo-cola"),

    comparacion: $("comparacion"),
    resumenComparacion: $("resumen-comparacion"),
    comparacionGantt: $("comparacion-gantt"),
    leyendaComparacion: $("leyenda-comparacion"),
    cuerpoComparacion: $("cuerpo-comparacion"),
    pieComparacion: $("pie-comparacion"),
  };

  // Ancho mínimo (px) de cada unidad de tiempo en el Gantt.
  const PX_POR_UNIDAD = 28;

  // ---------------------------------------------------------------------------
  // Utilidades de DOM (sin innerHTML con datos del usuario)
  // ---------------------------------------------------------------------------

  function crear(etiqueta, opciones = {}, hijos = []) {
    const nodo = document.createElement(etiqueta);
    if (opciones.clase) nodo.className = opciones.clase;
    if (opciones.texto !== undefined) nodo.textContent = opciones.texto;
    if (opciones.atributos) {
      for (const [k, v] of Object.entries(opciones.atributos)) nodo.setAttribute(k, v);
    }
    if (opciones.estilo) {
      for (const [k, v] of Object.entries(opciones.estilo)) nodo.style.setProperty(k, v);
    }
    for (const hijo of hijos) nodo.appendChild(hijo);
    return nodo;
  }

  function celda(texto, clase, etiqueta = "td") {
    return crear(etiqueta, { texto: String(texto), clase });
  }

  function mostrarEstado(mensaje, tipo = "") {
    ui.estado.textContent = mensaje;
    ui.estado.className = "estado" + (tipo ? " " + tipo : "");
  }

  function colorDe(id) {
    const i = estado.procesos.findIndex((p) => p.id === id);
    return PALETA[(i < 0 ? 0 : i) % PALETA.length];
  }

  function chip(id) {
    const esIdle = id === IDLE;
    return crear("span", {
      clase: "chip" + (esIdle ? " idle" : ""),
      texto: id,
      estilo: esIdle ? {} : { "--color": colorDe(id) },
    });
  }

  const fmt2 = (n) => Number(n).toFixed(2);

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  const ENTERO = /^-?\d+$/;

  /**
   * Valida los valores del formulario.
   * @param {object} valores  Cadenas tal como vienen de los campos.
   * @param {number|null} indiceIgnorado  Índice del proceso en edición (para no chocar consigo mismo).
   * @returns {{ errores: object, proceso: object|null }}
   */
  function validar(valores, indiceIgnorado) {
    const errores = {};
    const id = valores.id.trim();
    const llegadaTxt = valores.llegada.trim();
    const rafagaTxt = valores.rafaga.trim();
    const prioridadTxt = valores.prioridad.trim();

    // Identificador
    if (id === "") {
      errores.id = "El identificador es obligatorio.";
    } else if (/\s/.test(id)) {
      errores.id = "El identificador no puede contener espacios.";
    } else if (id.toUpperCase() === IDLE) {
      errores.id = `"${IDLE}" está reservado para la CPU inactiva.`;
    } else if (
      estado.procesos.some(
        (p, i) => i !== indiceIgnorado && p.id.toLowerCase() === id.toLowerCase()
      )
    ) {
      errores.id = `Ya existe un proceso con el identificador "${id}".`;
    }

    // Llegada
    let llegada = null;
    if (llegadaTxt === "") {
      errores.llegada = "El tiempo de llegada es obligatorio.";
    } else if (!ENTERO.test(llegadaTxt)) {
      errores.llegada = "Debe ser un número entero.";
    } else {
      llegada = Number(llegadaTxt);
      if (llegada < 0) errores.llegada = "La llegada no puede ser negativa.";
    }

    // Ráfaga
    let rafaga = null;
    if (rafagaTxt === "") {
      errores.rafaga = "La ráfaga de CPU es obligatoria.";
    } else if (!ENTERO.test(rafagaTxt)) {
      errores.rafaga = "Debe ser un número entero.";
    } else {
      rafaga = Number(rafagaTxt);
      if (rafaga <= 0) errores.rafaga = "La ráfaga debe ser mayor que 0.";
    }

    // Prioridad (opcional; por defecto 0)
    let prioridad = 0;
    if (prioridadTxt !== "") {
      if (!ENTERO.test(prioridadTxt)) {
        errores.prioridad = "Debe ser un número entero.";
      } else {
        prioridad = Number(prioridadTxt);
      }
    }

    const valido = Object.keys(errores).length === 0;
    return {
      errores,
      proceso: valido ? { id, llegada, rafaga, prioridad } : null,
    };
  }

  function pintarErrores(errores) {
    for (const campo of Object.keys(ui.campos)) {
      const mensaje = errores[campo] || "";
      ui.errores[campo].textContent = mensaje;
      if (mensaje) ui.campos[campo].setAttribute("aria-invalid", "true");
      else ui.campos[campo].removeAttribute("aria-invalid");
    }
  }

  // El navegador entrega "" en input[type=number] si el texto no es numérico;
  // en ese caso conservamos un marcador para informar "debe ser entero".
  function leerCampo(input) {
    if (input.type === "number" && input.value === "" && input.validity.badInput) return "x";
    return input.value;
  }

  // ---------------------------------------------------------------------------
  // Formulario: agregar / editar
  // ---------------------------------------------------------------------------

  function limpiarFormulario() {
    ui.form.reset();
    pintarErrores({});
  }

  function salirDeEdicion() {
    estado.editando = null;
    ui.leyendaForm.textContent = "Agregar proceso";
    ui.btnGuardar.textContent = "Agregar proceso";
    ui.btnCancelar.hidden = true;
    limpiarFormulario();
    renderProcesos();
  }

  function entrarEnEdicion(indice) {
    const p = estado.procesos[indice];
    estado.editando = indice;
    ui.campos.id.value = p.id;
    ui.campos.llegada.value = p.llegada;
    ui.campos.rafaga.value = p.rafaga;
    ui.campos.prioridad.value = p.prioridad;
    pintarErrores({});
    ui.leyendaForm.textContent = `Editar proceso ${p.id}`;
    ui.btnGuardar.textContent = "Guardar cambios";
    ui.btnCancelar.hidden = false;
    renderProcesos();
    ui.campos.id.focus();
    ui.campos.id.select();
  }

  function alEnviarFormulario(evento) {
    evento.preventDefault();
    const valores = {
      id: ui.campos.id.value,
      llegada: leerCampo(ui.campos.llegada),
      rafaga: leerCampo(ui.campos.rafaga),
      prioridad: leerCampo(ui.campos.prioridad),
    };
    const { errores, proceso } = validar(valores, estado.editando);
    pintarErrores(errores);

    if (!proceso) {
      const primero = Object.keys(ui.campos).find((c) => errores[c]);
      ui.campos[primero].focus();
      mostrarEstado("Revisa los campos marcados en rojo.", "error");
      return;
    }

    if (estado.editando !== null) {
      estado.procesos[estado.editando] = proceso;
      mostrarEstado(`Proceso ${proceso.id} actualizado.`, "ok");
      salirDeEdicion();
    } else {
      estado.procesos.push(proceso);
      mostrarEstado(`Proceso ${proceso.id} agregado.`, "ok");
      limpiarFormulario();
      renderProcesos();
    }
    ocultarResultados();
    ui.campos.id.focus();
  }

  function eliminar(indice) {
    const { id } = estado.procesos[indice];
    estado.procesos.splice(indice, 1);
    if (estado.editando === indice) {
      salirDeEdicion();
    } else if (estado.editando !== null && estado.editando > indice) {
      estado.editando--;
    }
    renderProcesos();
    ocultarResultados();
    mostrarEstado(`Proceso ${id} eliminado.`, "ok");
    ui.campos.id.focus();
  }

  // ---------------------------------------------------------------------------
  // Tabla de procesos
  // ---------------------------------------------------------------------------

  function renderProcesos() {
    ui.cuerpoProcesos.replaceChildren();

    estado.procesos.forEach((p, i) => {
      const btnEditar = crear("button", {
        clase: "btn btn-secundario btn-pequeno",
        texto: "Editar",
        atributos: { type: "button", "aria-label": `Editar ${p.id}` },
      });
      btnEditar.addEventListener("click", () => entrarEnEdicion(i));

      const btnEliminar = crear("button", {
        clase: "btn btn-peligro btn-pequeno",
        texto: "Eliminar",
        atributos: { type: "button", "aria-label": `Eliminar ${p.id}` },
      });
      btnEliminar.addEventListener("click", () => eliminar(i));

      const fila = crear("tr", { clase: estado.editando === i ? "editando" : "" }, [
        celda(i + 1),
        crear("td", {}, [chip(p.id)]),
        celda(p.llegada, "num"),
        celda(p.rafaga, "num"),
        celda(p.prioridad, "num"),
        crear("td", { clase: "celda-acciones" }, [btnEditar, btnEliminar]),
      ]);
      ui.cuerpoProcesos.appendChild(fila);
    });

    const vacio = estado.procesos.length === 0;
    ui.sinProcesos.hidden = !vacio;
    ui.tablaProcesos.hidden = vacio;
  }

  // ---------------------------------------------------------------------------
  // Simulación y resultados
  // ---------------------------------------------------------------------------

  function ocultarResultados() {
    ui.resultados.hidden = true;
    ui.comparacion.hidden = true;
  }

  const tiempoTotal = (resultado) => resultado.gantt[resultado.gantt.length - 1].fin;

  /** Comprueba que se pueda simular; si no, informa y devuelve false. */
  function puedeSimular() {
    if (estado.editando !== null) {
      mostrarEstado("Guarda o cancela la edición en curso antes de simular.", "error");
      return false;
    }
    if (estado.procesos.length === 0) {
      mostrarEstado("Agrega al menos un proceso para simular.", "error");
      ui.campos.id.focus();
      return false;
    }
    return true;
  }

  function simular() {
    if (!puedeSimular()) return;

    const clave = ui.algoritmo.value;
    let resultado;
    try {
      resultado = window.Scheduler[clave](estado.procesos);
    } catch (e) {
      mostrarEstado("No se pudo simular: " + e.message, "error");
      return;
    }

    renderGantt(resultado);
    renderMetricas(resultado);
    renderCola(resultado);
    ui.comparacion.hidden = true;
    ui.resultados.hidden = false;
    mostrarEstado(
      `Simulación ${resultado.algoritmo} completada: ${estado.procesos.length} procesos, ` +
        `tiempo total ${tiempoTotal(resultado)}.`,
      "ok"
    );
  }

  function comparar() {
    if (!puedeSimular()) return;

    let resultados;
    try {
      resultados = [window.Scheduler.fifo(estado.procesos), window.Scheduler.sjf(estado.procesos)];
    } catch (e) {
      mostrarEstado("No se pudo comparar: " + e.message, "error");
      return;
    }

    renderComparacion(resultados);
    ui.resultados.hidden = true;
    ui.comparacion.hidden = false;
    mostrarEstado(
      `Comparación completada: FIFO y SJF con los mismos ${estado.procesos.length} procesos.`,
      "ok"
    );
  }

  function reiniciar() {
    estado.procesos = [];
    salirDeEdicion();
    ui.algoritmo.value = "fifo";
    actualizarDescripcion();
    ocultarResultados();
    mostrarEstado("Simulador reiniciado: se borraron los procesos y los resultados.", "ok");
    ui.campos.id.focus();
  }

  function cargarEjemplo() {
    estado.procesos = EJEMPLO.map((p) => ({ ...p }));
    salirDeEdicion();
    ocultarResultados();
    mostrarEstado("Ejemplo cargado: 5 procesos.", "ok");
  }

  function actualizarDescripcion() {
    ui.descripcion.textContent = DESCRIPCIONES[ui.algoritmo.value];
  }

  // ---------- Gantt ----------

  /** Paso del eje para que haya como mucho ~25 marcas. */
  function pasoDelEje(total) {
    const candidatos = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    return candidatos.find((c) => total / c <= 25) || Math.ceil(total / 25);
  }

  /**
   * Construye un diagrama de Gantt.
   * @param {Array} gantt   Tramos {id, inicio, fin}.
   * @param {number} escala Tiempo que representa el 100 % del ancho. Usar el mismo
   *                        valor en varios diagramas los deja con la misma escala.
   * @param {object} opciones { titulo?: string, tituloEje?: boolean }
   */
  function construirGantt(gantt, escala, opciones = {}) {
    const { titulo = null, tituloEje = true } = opciones;
    const contenedor = crear("div", {
      clase: "gantt",
      estilo: { "min-width": escala * PX_POR_UNIDAD + "px" },
    });

    if (titulo) contenedor.appendChild(crear("h3", { clase: "gantt-titulo", texto: titulo }));

    // Barras: ancho proporcional a la duración respecto de la escala común.
    const barras = crear("div", {
      clase: "gantt-barras",
      atributos: {
        role: "img",
        "aria-label":
          (titulo ? titulo + ". " : "") +
          "Diagrama de Gantt: " +
          gantt.map((t) => `${t.id} de ${t.inicio} a ${t.fin}`).join("; ") +
          ".",
      },
    });
    for (const tramo of gantt) {
      const duracion = tramo.fin - tramo.inicio;
      const esIdle = tramo.id === IDLE;
      barras.appendChild(
        crear("div", {
          clase: "segmento" + (esIdle ? " idle" : ""),
          texto: tramo.id,
          atributos: { title: `${tramo.id}: de ${tramo.inicio} a ${tramo.fin} (${duracion} u)` },
          estilo: {
            width: (duracion / escala) * 100 + "%",
            ...(esIdle ? {} : { "--color": colorDe(tramo.id) }),
          },
        })
      );
    }
    contenedor.appendChild(barras);

    // Eje: marcas regulares hasta la escala + límites de cada tramo (resaltados).
    const limites = new Set([0, ...gantt.map((t) => t.fin)]);
    const marcas = new Set(limites);
    const paso = pasoDelEje(escala);
    for (let t = 0; t <= escala; t += paso) marcas.add(t);
    marcas.add(escala);

    const eje = crear("div", { clase: "gantt-eje", atributos: { "aria-hidden": "true" } });
    [...marcas]
      .sort((a, b) => a - b)
      .forEach((t) => {
        eje.appendChild(
          crear("span", {
            clase: "marca" + (limites.has(t) ? " limite" : ""),
            texto: String(t),
            estilo: { left: (t / escala) * 100 + "%" },
          })
        );
      });
    contenedor.appendChild(eje);

    if (tituloEje) {
      contenedor.appendChild(
        crear("p", {
          clase: "gantt-eje-titulo",
          texto: "Tiempo (unidades)",
          atributos: { "aria-hidden": "true" },
        })
      );
    }
    return contenedor;
  }

  /** Rellena una leyenda con los identificadores presentes en uno o varios Gantt. */
  function renderLeyenda(lista, gantts) {
    lista.replaceChildren();
    const ids = new Set();
    for (const g of gantts) for (const t of g) ids.add(t.id);
    // Orden: IDLE primero (si aparece) y luego en el orden de la lista de procesos.
    const ordenados = [
      ...(ids.has(IDLE) ? [IDLE] : []),
      ...estado.procesos.map((p) => p.id).filter((id) => ids.has(id)),
    ];
    for (const id of ordenados) {
      const etiqueta = id === IDLE ? "CPU inactiva" : `Proceso ${id}`;
      lista.appendChild(crear("li", {}, [chip(id), crear("span", { texto: etiqueta })]));
    }
  }

  function renderGantt(resultado) {
    const total = tiempoTotal(resultado);
    ui.ganttContenedor.replaceChildren(construirGantt(resultado.gantt, total));
    ui.resumenGantt.textContent =
      `Algoritmo ${resultado.algoritmo}. Tiempo total: ${total} unidades. ` +
      "El ancho de cada bloque es proporcional a su duración; los tramos IDLE (gris rayado) indican CPU inactiva.";
    renderLeyenda(ui.leyenda, [resultado.gantt]);
  }

  // ---------- Comparación ----------

  const MENOS = "−"; // signo menos tipográfico

  function conSigno(n) {
    const v = Number(fmt2(n));
    if (v === 0) return "0.00";
    return (v > 0 ? "+" : MENOS) + fmt2(Math.abs(v));
  }

  function renderComparacion(resultados) {
    // Misma escala para ambos diagramas: el mayor tiempo total.
    const escala = Math.max(...resultados.map(tiempoTotal));

    const grupo = crear("div", { clase: "gantt-grupo" });
    resultados.forEach((r, i) => {
      grupo.appendChild(
        construirGantt(r.gantt, escala, {
          titulo: `${r.algoritmo} — termina en t = ${tiempoTotal(r)}`,
          tituloEje: i === resultados.length - 1,
        })
      );
    });
    ui.comparacionGantt.replaceChildren(grupo);
    renderLeyenda(ui.leyendaComparacion, resultados.map((r) => r.gantt));

    ui.resumenComparacion.textContent =
      `Ambos diagramas usan la misma escala de 0 a ${escala} unidades, ` +
      "así que las posiciones y los anchos se pueden comparar directamente.";

    // Tabla de promedios; se marca el menor valor de cada columna (puede haber empate).
    // Se muestran los promedios redondeados de scheduler.js; la diferencia se calcula
    // con la media sin redondear para no acumular error de redondeo.
    const mediaCruda = (r, campo) =>
      r.metricas.reduce((s, m) => s + m[campo], 0) / r.metricas.length;
    const columnas = ["espera", "retorno", "respuesta"];
    const minimos = columnas.map((c) => Math.min(...resultados.map((r) => r.promedios[c])));

    ui.cuerpoComparacion.replaceChildren();
    for (const r of resultados) {
      const celdas = columnas.map((c, j) => {
        const v = r.promedios[c];
        const td = crear("td", { clase: "num" }, [crear("span", { texto: fmt2(v) })]);
        const hayDiferencia = resultados.some((otro) => otro.promedios[c] !== v);
        if (v === minimos[j] && hayDiferencia) {
          td.classList.add("mejor");
          td.appendChild(crear("span", { clase: "marca-mejor", texto: "menor" }));
        }
        return td;
      });
      ui.cuerpoComparacion.appendChild(
        crear("tr", {}, [crear("th", { texto: r.algoritmo, atributos: { scope: "row" } }), ...celdas])
      );
    }

    // Diferencia SJF − FIFO
    const [rFifo, rSjf] = resultados;
    ui.pieComparacion.replaceChildren(
      crear("tr", {}, [
        crear("th", { texto: `Diferencia (SJF ${MENOS} FIFO)`, atributos: { scope: "row" } }),
        ...columnas.map((c) => celda(conSigno(mediaCruda(rSjf, c) - mediaCruda(rFifo, c)), "num")),
      ])
    );
  }

  // ---------- Métricas ----------

  function renderMetricas(resultado) {
    ui.cuerpoMetricas.replaceChildren();
    for (const m of resultado.metricas) {
      ui.cuerpoMetricas.appendChild(
        crear("tr", {}, [
          crear("th", { atributos: { scope: "row" } }, [chip(m.id)]),
          celda(m.llegada, "num"),
          celda(m.rafaga, "num"),
          celda(m.inicio, "num"),
          celda(m.fin, "num"),
          celda(m.espera, "num"),
          celda(m.retorno, "num"),
          celda(m.respuesta, "num"),
        ])
      );
    }

    const { promedios } = resultado;
    const pie = crear("tr", {}, [
      crear("th", { texto: "Promedio", atributos: { scope: "row", colspan: "5" } }),
      celda(fmt2(promedios.espera), "num"),
      celda(fmt2(promedios.retorno), "num"),
      celda(fmt2(promedios.respuesta), "num"),
    ]);
    ui.pieMetricas.replaceChildren(pie);
  }

  // ---------- Cola de listos ----------

  function renderCola(resultado) {
    const fragmento = document.createDocumentFragment();
    for (const registro of resultado.colaListos) {
      let contenidoCola;
      if (registro.cola.length === 0) {
        contenidoCola = crear("span", { clase: "cola-vacia", texto: "vacía" });
      } else {
        contenidoCola = crear(
          "ol",
          { clase: "lista-chips", atributos: { "aria-label": `Cola: ${registro.cola.join(", ")}` } },
          registro.cola.map((id) => crear("li", {}, [chip(id)]))
        );
      }
      fragmento.appendChild(
        crear("tr", {}, [
          celda(registro.instante, "num"),
          crear("td", {}, [chip(registro.ejecutando)]),
          crear("td", {}, [contenidoCola]),
        ])
      );
    }
    ui.cuerpoCola.replaceChildren(fragmento);
  }

  // ---------------------------------------------------------------------------
  // Eventos e inicio
  // ---------------------------------------------------------------------------

  ui.form.addEventListener("submit", alEnviarFormulario);
  ui.btnCancelar.addEventListener("click", () => {
    salirDeEdicion();
    mostrarEstado("Edición cancelada.");
    ui.campos.id.focus();
  });
  ui.btnEjemplo.addEventListener("click", cargarEjemplo);
  ui.btnSimular.addEventListener("click", simular);
  ui.btnComparar.addEventListener("click", comparar);
  ui.btnReiniciar.addEventListener("click", reiniciar);
  ui.algoritmo.addEventListener("change", () => {
    actualizarDescripcion();
    // La comparación no depende del algoritmo seleccionado; solo se oculta la simulación individual.
    ui.resultados.hidden = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && estado.editando !== null) {
      salirDeEdicion();
      mostrarEstado("Edición cancelada.");
    }
  });

  actualizarDescripcion();
  renderProcesos();
})();
