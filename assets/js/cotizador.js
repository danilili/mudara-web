// Cotizador de Mudara (prototipo). Calcula en el navegador; el envío lo hace main.js.
(function () {
  "use strict";

  var CFG = window.MUDARA_CONFIG || {};
  var T = CFG.tarifas;
  if (!T) return;

  // Cálculo ----------------------------------------------------------------------

  // Dos escenarios a partir de los espacios declarados, en camionetas.
  function estimarCamionetas(totalEspacios) {
    var estimado = totalEspacios * T.camionetaPorEspacio;
    var base = Math.max(1, Math.ceil(estimado / T.pasoRango - 1e-9) * T.pasoRango);
    var alterno = base + T.margenRango;
    return { base: base, alterno: alterno <= T.maxCamionetas ? alterno : null };
  }

  function factorDia(fechaISO) {
    var p = fechaISO.split("-").map(Number);
    var dia = new Date(p[0], p[1] - 1, p[2]).getDay(); // 0 domingo ... 6 sábado
    return dia >= 1 && dia <= 4 ? T.factorLunesAJueves : 1;
  }

  function factorHora(horario) {
    return T.horariosNoche.indexOf(horario) >= 0 ? T.factorNoche : 1;
  }

  // Un punto paga acceso si no hay dónde estacionarse en la entrada o si es un piso alto sin elevador.
  function cobraAcceso(p) {
    var pisoAlto = p.depto && p.piso >= 2 && !(p.elevador && T.elevadorEvitaCargo);
    return Boolean(p.sinEstacionar || pisoAlto);
  }

  // Gasolina, acceso y cajas van por camioneta necesaria: 2.5 camionetas cuentan como 3.
  function calcularPrecio(c) {
    var necesarias = Math.ceil(c.camionetas);
    var carga = c.camionetas * T.precioCamioneta;
    var gasolina = (c.km / T.kmPorLitro) * c.precioGasolina * necesarias;
    var acceso = T.accesoPorCamioneta * necesarias * c.puntosAcceso;
    var cajas = c.cajas ? T.cajasPorCamioneta * necesarias : 0;
    var subtotal = carga + gasolina + acceso;
    var factor = factorDia(c.fecha) * factorHora(c.horario);
    // Las cajas son una venta: no llevan descuento ni recargo de día y hora.
    return {
      camionetas: c.camionetas, necesarias: necesarias, carga: carga, gasolina: gasolina,
      acceso: acceso, cajas: cajas, subtotal: subtotal, factor: factor,
      total: Math.round(subtotal * factor) + cajas
    };
  }

  // Decide qué camino sigue la solicitud. Sin DOM, para poder probarlo aparte.
  function evaluar(d) {
    if (d.tipo === "flete" || d.tipo === "oficina") return { camino: "llamada", motivo: d.tipo };
    if (d.origen === "fuera" || d.destino === "fuera") return { camino: "llamada", motivo: "foranea" };
    if (!d.origen) return { camino: "incompleto", campo: "origen", falta: "el municipio de origen" };
    if (!d.destino) return { camino: "incompleto", campo: "destino", falta: "el municipio de destino" };
    if (d.totalEspacios < 1) return { camino: "incompleto", campo: "recamaras", falta: "al menos un espacio" };

    var rango = estimarCamionetas(d.totalEspacios);
    if (d.especiales) return { camino: "visita-especial", camionetas: rango.base };
    if (rango.base > T.maxCamionetas) return { camino: "visita-residencial", camionetas: rango.base };

    if (!d.fecha) return { camino: "incompleto", campo: "fecha", falta: "la fecha" };
    if (d.fecha < d.hoy) return { camino: "incompleto", campo: "fecha", falta: "una fecha de hoy en adelante" };
    if (!(d.km > 0)) return { camino: "incompleto", campo: "km", falta: "los kilómetros de origen a destino" };

    var puntos = (cobraAcceso(d.accesoOrigen) ? 1 : 0) + (cobraAcceso(d.accesoDestino) ? 1 : 0);
    var precio = function (camionetas) {
      return calcularPrecio({
        camionetas: camionetas, km: d.km, precioGasolina: d.precioGasolina,
        puntosAcceso: puntos, cajas: d.cajas, fecha: d.fecha, horario: d.horario
      });
    };
    return {
      camino: "cotizacion",
      base: precio(rango.base),
      alterno: rango.alterno === null ? null : precio(rango.alterno)
    };
  }

  window.MudaraCotizador = {
    estimarCamionetas: estimarCamionetas, calcularPrecio: calcularPrecio,
    cobraAcceso: cobraAcceso, evaluar: evaluar
  };

  var form = document.querySelector("[data-cotizador]");
  if (!form) return;

  // Pantalla ---------------------------------------------------------------------

  var salida = form.querySelector("[data-resultado]");
  var campoResumen = form.querySelector("[data-resumen]");
  var ESPACIOS = ["recamaras", "salas", "comedores", "cocinas", "estudios", "bodegas"];
  var NOMBRES = { recamaras: "Recámaras", salas: "Salas", comedores: "Comedores", cocinas: "Cocinas", estudios: "Estudios o cuartos extra", bodegas: "Bodegas" };
  var TIPOS = { casa: "Casa", departamento: "Departamento", oficina: "Oficina", flete: "Flete" };
  var PISOS = { 1: "planta baja", 2: "2.º piso", 3: "3.er piso", 4: "4.º piso", 5: "5.º piso o más" };
  var VALIDABLES = ["origen", "destino", "recamaras", "fecha", "km"];

  var ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  var hoy = ahora.toISOString().slice(0, 10);

  var campo = function (nombre) { return form.elements[nombre]; };
  var visible = function (el) { return Boolean(el) && !el.closest("[hidden]"); };
  var marcado = function (nombre) { return visible(campo(nombre)) && campo(nombre).checked; };

  if (campo("gasolina")) {
    campo("gasolina").defaultValue = T.precioGasolina;
    campo("gasolina").value = T.precioGasolina;
  }

  // Muestra solo las preguntas que aplican al tipo de mudanza y de destino.
  function ajustarCampos() {
    var tipo = campo("tipo").value;
    form.querySelectorAll("[data-tipos]").forEach(function (el) {
      el.hidden = el.getAttribute("data-tipos").split(" ").indexOf(tipo) < 0;
    });
    form.querySelectorAll("[data-destino-depto]").forEach(function (el) {
      el.hidden = campo("destinoTipo").value !== "departamento";
    });
  }

  function pesos(n) {
    return "$" + Math.round(n).toLocaleString("es-MX");
  }

  function textoCamionetas(n) {
    var entero = Math.floor(n);
    var resto = n - entero;
    var fraccion = resto === 0.25 ? "¼" : resto === 0.5 ? "½" : resto === 0.75 ? "¾" : "";
    return (entero || "") + fraccion + (n === 1 ? " camioneta" : " camionetas");
  }

  // Textos de tiempo y embalado; lo que falta definir se muestra entre corchetes.
  function textoTiempo() {
    var extra = T.precioHoraExtra ? pesos(T.precioHoraExtra) + " por hora" : "[precio por definir]";
    return "Incluye hasta " + T.horasIncluidas + " horas de servicio. Cada hora extra: " + extra + ".";
  }

  function textoEmbalado() {
    var costo = T.precioEmbalado ? pesos(T.precioEmbalado) : "[costo y tiempo por definir]";
    return "Embalado: " + costo + ". El embalado alarga el servicio y puede requerir horas extra.";
  }

  function crear(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function leer() {
    var tipo = campo("tipo").value;
    var espacios = {};
    var total = 0;
    ESPACIOS.forEach(function (n) {
      espacios[n] = visible(campo(n)) ? Math.max(0, Math.floor(Number(campo(n).value) || 0)) : 0;
      total += espacios[n];
    });
    return {
      tipo: tipo,
      origen: campo("origen").value,
      destino: campo("destino").value,
      espacios: espacios,
      totalEspacios: total,
      especiales: marcado("especiales"),
      cajas: marcado("cajas"),
      embalado: marcado("embalado"),
      fecha: campo("fecha").value,
      horario: campo("horario").value,
      km: campo("km") && campo("km").value !== "" ? Number(campo("km").value) || 0 : T.kmPromedio,
      origenColonia: campo("origenColonia").value.trim(), origenCP: campo("origenCP").value.trim(),
      destinoColonia: campo("destinoColonia").value.trim(), destinoCP: campo("destinoCP").value.trim(),
      precioGasolina: campo("gasolina") ? Number(campo("gasolina").value) || 0 : T.precioGasolina,
      accesoOrigen: {
        sinEstacionar: marcado("origenSinEstacionar"), depto: tipo === "departamento",
        piso: Number(campo("origenPiso").value), elevador: marcado("origenElevador")
      },
      accesoDestino: {
        sinEstacionar: marcado("destinoSinEstacionar"), depto: campo("destinoTipo").value === "departamento",
        piso: Number(campo("destinoPiso").value), elevador: marcado("destinoElevador")
      },
      hoy: hoy
    };
  }

  function textoAcceso(p) {
    var partes = [p.depto ? "departamento, " + PISOS[p.piso] + (p.elevador ? ", con elevador" : ", sin elevador") : "casa"];
    if (p.sinEstacionar) partes.push("sin estacionamiento en la entrada");
    return partes.join(", ");
  }

  function listaEspacios(d) {
    return ESPACIOS.filter(function (n) { return d.espacios[n] > 0; })
      .map(function (n) { return NOMBRES[n] + ": " + d.espacios[n]; });
  }

  function textoResultado(r) {
    if (r.camino === "cotizacion") {
      return "Estimación: " + textoCamionetas(r.base.camionetas) + " " + pesos(r.base.total) +
        (r.alterno ? "; " + textoCamionetas(r.alterno.camionetas) + " " + pesos(r.alterno.total) : "");
    }
    if (r.camino === "llamada") return "Cotizar por llamada (" + r.motivo + ")";
    if (r.camino === "incompleto") return "Sin estimación: falta " + r.falta;
    return "Requiere visita previa (estimado: " + textoCamionetas(r.camionetas) + ")";
  }

  // Lo que recibe Mudara con la solicitud.
  function resumen(d, r) {
    var extras = [d.especiales ? "objetos especiales" : "", d.embalado ? "embalado" : "", d.cajas ? "cajas de plástico" : ""]
      .filter(Boolean);
    return [
      "Tipo: " + TIPOS[d.tipo],
      "Espacios: " + (listaEspacios(d).join(", ") || "—"),
      "Extras: " + (extras.join(", ") || "—"),
      "Origen: " + [d.origenColonia || "—", d.origen || "—", "CP " + (d.origenCP || "—")].join(", ") + " (" + textoAcceso(d.accesoOrigen) + ")",
      "Destino: " + [d.destinoColonia || "—", d.destino || "—", "CP " + (d.destinoCP || "—")].join(", ") + " (" + textoAcceso(d.accesoDestino) + ")",
      "Distancia usada: " + d.km + " km (confirmar la real)",
      "Fecha: " + (d.fecha || "—") + ", " + d.horario + " h",
      textoResultado(r)
    ].join("\n");
  }

  // Mensaje para el cliente, que Alex revisa antes de enviar.
  function borrador(d, r) {
    var lineas = ["Hola, esta es tu cotización de Mudara:", "", "Lo que nos dijiste que se mueve:"];
    lineas = lineas.concat(listaEspacios(d));
    lineas.push("", "Fecha: " + d.fecha + ", " + d.horario + " h");
    lineas.push("", "En " + textoCamionetas(r.base.camionetas) + ": " + pesos(r.base.total));
    if (r.alterno) lineas.push("Si hacen falta " + textoCamionetas(r.alterno.camionetas) + ": " + pesos(r.alterno.total));
    lineas.push("", textoTiempo());
    if (d.embalado) lineas.push(textoEmbalado());
    lineas.push("", "Los precios incluyen IVA. Si aparecen cosas extra, se cotizan aparte antes de cargarlas.");
    lineas.push("Si estás de acuerdo, responde CONFIRMO para apartar tu fecha.");
    return lineas.join("\n");
  }

  function mostrarAviso(titulo, texto) {
    salida.appendChild(crear("h3", "resultado-titulo", titulo));
    salida.appendChild(crear("p", "", texto));
  }

  function tarjetaPrecio(p, etiqueta) {
    var tarjeta = crear("section", "tarjeta precio");
    tarjeta.appendChild(crear("h4", "", etiqueta + ": " + textoCamionetas(p.camionetas)));
    tarjeta.appendChild(crear("p", "precio-total", pesos(p.total)));
    var lista = crear("dl", "desglose");
    var fila = function (nombre, valor) {
      lista.appendChild(crear("dt", "", nombre));
      lista.appendChild(crear("dd", "", valor));
    };
    fila("Carga", pesos(p.carga));
    fila("Gasolina estimada (" + p.necesarias + (p.necesarias === 1 ? " camioneta)" : " camionetas)"), pesos(p.gasolina));
    if (p.acceso) fila("Acceso", pesos(p.acceso));
    fila("Subtotal", pesos(p.subtotal));
    fila("Factor de día y hora", "× " + p.factor.toFixed(2));
    if (p.cajas) fila("Cajas de plástico (sin ajuste)", pesos(p.cajas));
    tarjeta.appendChild(lista);
    return tarjeta;
  }

  function pintar() {
    ajustarCampos();
    var d = leer();
    var r = evaluar(d);
    salida.textContent = "";
    if (campoResumen) campoResumen.value = resumen(d, r);
    VALIDABLES.forEach(function (n) { if (campo(n)) campo(n).setCustomValidity(""); });

    if (r.camino === "incompleto") {
      if (campo(r.campo)) campo(r.campo).setCustomValidity("Escribe " + r.falta + ".");
      mostrarAviso("Tu estimación", "Para calcularla, escribe " + r.falta + ".");
    } else if (r.camino === "llamada") {
      var motivos = {
        flete: "Los fletes se cotizan por teléfono.",
        oficina: "Las mudanzas de oficina se cotizan por teléfono.",
        foranea: "Las mudanzas fuera de la Zona Metropolitana de Guadalajara se cotizan por teléfono."
      };
      mostrarAviso("Agendemos una llamada", motivos[r.motivo] + " Déjanos tus datos y te llamamos.");
    } else if (r.camino === "visita-especial") {
      mostrarAviso("Requiere visita previa", "Los instrumentos musicales grandes, cajas fuertes y obras de arte requieren una visita antes de cotizar. Déjanos tus datos para agendarla.");
      salida.appendChild(crear("p", "pendiente", "[Confirmar con Alex si esta visita también cuesta " + pesos(T.visitaPrevia) + "]"));
    } else if (r.camino === "visita-residencial") {
      mostrarAviso("Requiere visita previa", "Estimamos " + textoCamionetas(r.camionetas) + ", así que hacemos una visita para darte el precio exacto. Cuesta " + pesos(T.visitaPrevia) + " y se abona a tu mudanza si aceptas la cotización.");
    } else if (CFG.mostrarEstimacionAlCliente === false) {
      mostrarAviso("Tu cotización", "Envía tus datos y te mandamos tu cotización por WhatsApp.");
    } else {
      mostrarAviso("Tu estimación", "Es preliminar: Mudara la confirma por WhatsApp antes de apartar tu fecha.");
      salida.appendChild(tarjetaPrecio(r.base, "Si cabe en"));
      if (r.alterno) {
        salida.appendChild(tarjetaPrecio(r.alterno, "Si hacen falta"));
      } else {
        salida.appendChild(crear("p", "", "Si no cabe en " + T.maxCamionetas + " camionetas, hacemos una visita previa de " + pesos(T.visitaPrevia) + "."));
      }
      salida.appendChild(crear("p", "microcopy", "Precios con IVA. " + textoTiempo()));
      if (d.embalado) salida.appendChild(crear("p", "pendiente", textoEmbalado()));
      if (CFG.modoRevision) {
        var detalle = crear("details", "borrador");
        detalle.appendChild(crear("summary", "", "Ver el mensaje que revisaría Alex"));
        detalle.appendChild(crear("pre", "", borrador(d, r)));
        salida.appendChild(detalle);
      }
    }
  }

  form.addEventListener("input", pintar);
  form.addEventListener("change", pintar);
  form.addEventListener("reset", function () { setTimeout(pintar, 0); });
  pintar();
})();
