// Cotizador de Mudara (prototipo). Calcula en el navegador; el envío lo hace main.js.
(function () {
  "use strict";

  var CFG = window.MUDARA_CONFIG || {};
  var T = CFG.tarifas;
  if (!T) return;

  // Cálculo ----------------------------------------------------------------------

  // Carga mínima y máxima, en camionetas, según el tipo de vivienda.
  function rangoCamionetas(tipo) {
    var r = T.rangosCamionetas[tipo];
    return r ? { min: r[0], max: r[1] } : null;
  }

  function factorDia(fechaISO) {
    var p = fechaISO.split("-").map(Number);
    var dia = new Date(p[0], p[1] - 1, p[2]).getDay(); // 0 domingo ... 6 sábado
    return dia >= 1 && dia <= 4 ? T.factorLunesAJueves : 1;
  }

  function factorHora(horario) {
    return T.horariosNoche.indexOf(horario) >= 0 ? T.factorNoche : 1;
  }

  // Pisos que se suben o bajan por escalera en un punto: el 2.º piso cuenta 1, el 3.º cuenta 2...
  function pisosEscalera(p) {
    if (!p.depto || p.piso < 2 || (p.elevador && T.elevadorEvitaCargo)) return 0;
    return p.piso - 1;
  }

  // Gasolina, acceso, cajas y personal van por camioneta necesaria: 2.5 camionetas cuentan como 3.
  function calcularPrecio(c) {
    var necesarias = Math.ceil(c.camionetas);
    var carga = c.camionetas * T.precioCamioneta;
    var gasolina = T.gasolinaPorCamioneta * necesarias;
    var sinEstacionar = T.accesoSinEstacionar * necesarias * c.puntosSinEstacionar;
    var pisoAlto = T.accesoPorPiso * necesarias * c.pisosEscalera;
    var acceso = sinEstacionar + pisoAlto;
    var cajas = c.cajas ? T.cajasPorCamioneta * necesarias : 0;
    var subtotal = carga + gasolina + acceso;
    var fDia = factorDia(c.fecha);
    var fHora = factorHora(c.horario);
    var factor = fDia * fHora;
    // Las cajas son una renta aparte: no llevan descuento ni recargo de día y hora.
    return {
      camionetas: c.camionetas, necesarias: necesarias, carga: carga, gasolina: gasolina,
      personas: T.cargadoresPorCamionetas[necesarias],
      sinEstacionar: sinEstacionar, puntosSinEstacionar: c.puntosSinEstacionar,
      pisoAlto: pisoAlto, pisosEscalera: c.pisosEscalera,
      acceso: acceso, cajas: cajas, subtotal: subtotal, factor: factor,
      // Ajustes en pesos, para explicarlos por separado: primero el día, luego la hora.
      ajusteDia: subtotal * (fDia - 1), ajusteHora: subtotal * fDia * (fHora - 1),
      total: Math.round(subtotal * factor) + cajas
    };
  }

  // Decide qué camino sigue la solicitud. Sin DOM, para poder probarlo aparte.
  // Los interiores y los objetos especiales no cambian el precio: son referencia para Mudara.
  function evaluar(d) {
    if (d.tipo === "flete" || d.tipo === "oficina") return { camino: "llamada", motivo: d.tipo };
    if (d.origen === "fuera" || d.destino === "fuera") return { camino: "llamada", motivo: "foranea" };
    if (!d.origen) return { camino: "incompleto", campo: "origen", falta: "el municipio de origen" };
    if (!d.destino) return { camino: "incompleto", campo: "destino", falta: "el municipio de destino" };

    var rango = rangoCamionetas(d.tipo);
    if (!rango) return { camino: "incompleto", campo: "tipo", falta: "el tipo de mudanza" };
    if (rango.min > T.maxCamionetas) return { camino: "visita-residencial", camionetas: rango.min };

    if (d.faltaEspeciales) return { camino: "incompleto", campo: "hayEspeciales", falta: "si llevas objetos especiales" };
    if (!d.fecha) return { camino: "incompleto", campo: "fecha", falta: "la fecha" };
    if (d.fecha < d.hoy) return { camino: "incompleto", campo: "fecha", falta: "una fecha de hoy en adelante" };

    // Los dos cargos de acceso son independientes y se suman en cada punto.
    var puntos = [d.accesoOrigen, d.accesoDestino];
    var sinEstacionar = puntos.filter(function (p) { return p.sinEstacionar; }).length;
    var pisos = pisosEscalera(d.accesoOrigen) + pisosEscalera(d.accesoDestino);
    var precio = function (camionetas) {
      return calcularPrecio({
        camionetas: camionetas, puntosSinEstacionar: sinEstacionar, pisosEscalera: pisos,
        cajas: d.cajas, fecha: d.fecha, horario: d.horario
      });
    };
    var max = Math.min(rango.max, T.maxCamionetas);
    return {
      camino: "cotizacion",
      base: precio(rango.min),
      alterno: max > rango.min ? precio(max) : null
    };
  }

  window.MudaraCotizador = {
    rangoCamionetas: rangoCamionetas, calcularPrecio: calcularPrecio,
    pisosEscalera: pisosEscalera, evaluar: evaluar
  };

  var form = document.querySelector("[data-cotizador]");
  if (!form) return;

  // Pantalla ---------------------------------------------------------------------

  var salida = form.querySelector("[data-resultado]");
  var campoResumen = form.querySelector("[data-resumen]");
  var INTERIORES = ["recamaras", "sala", "comedor", "cocina", "estudio", "bodega"];
  var NOMBRES = { recamaras: "Recámaras", sala: "Sala", comedor: "Comedor", cocina: "Cocina", estudio: "Estudio", bodega: "Bodega o patio" };
  var PISOS = { 1: "planta baja", 2: "2.º piso", 3: "3.er piso", 4: "4.º piso", 5: "5.º piso o más" };
  var VALIDABLES = ["origen", "destino", "fecha", "hayEspeciales"];
  var LEYENDA_ESPECIALES = "Las maniobras especiales con los objetos de esta lista se cotizan por separado según el criterio de nuestros ejecutivos.";

  var ahora = new Date();
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
  var hoy = ahora.toISOString().slice(0, 10);

  var campo = function (nombre) { return form.elements[nombre]; };
  var visible = function (el) { return Boolean(el) && !el.closest("[hidden]"); };
  var marcado = function (nombre) { return visible(campo(nombre)) && campo(nombre).checked; };
  // "depto-pareja" → "depto": la clase decide qué preguntas aplican.
  var clase = function (tipo) { return tipo.split("-")[0]; };

  // Llena las listas de interiores con las opciones del tipo de vivienda elegido.
  var tipoPintado = null;
  function llenarInteriores(tipo) {
    if (tipo === tipoPintado) return;
    tipoPintado = tipo;
    var I = CFG.interiores || {};
    var tamano = (I.tamanos || {})[tipo];
    INTERIORES.forEach(function (n) {
      var lista = campo(n);
      if (!lista) return;
      var grupo = I[n] || {};
      var opciones = grupo[tipo] || grupo[tamano] || [];
      var elegido = lista.selectedIndex;
      lista.textContent = "";
      opciones.forEach(function (texto) { lista.appendChild(new Option(texto, texto)); });
      if (elegido > 0 && elegido < opciones.length) lista.selectedIndex = elegido;
    });
  }

  // Muestra solo las preguntas que aplican al tipo de mudanza y de destino.
  function ajustarCampos() {
    var tipo = campo("tipo").value;
    llenarInteriores(tipo);
    form.querySelectorAll("[data-tipos]").forEach(function (el) {
      el.hidden = el.getAttribute("data-tipos").split(" ").indexOf(clase(tipo)) < 0;
    });
    form.querySelectorAll("[data-destino-depto]").forEach(function (el) {
      el.hidden = campo("destinoTipo").value !== "departamento";
    });
    form.querySelectorAll("[data-especiales]").forEach(function (el) {
      el.hidden = campo("hayEspeciales").value !== "si";
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

  function textoPersonal(p) {
    return "Asisten " + p.personas + " cargadores";
  }

  function textoCajas() {
    return "Las cajas de plástico son en renta: te las llevamos " + T.cajasDiasAntes +
      " días antes de la mudanza y las recogemos " + T.cajasDiasDespues + " días después.";
  }

  function textoEspeciales(d) {
    return "Objetos especiales: " + (d.especiales.join(", ") || "sin especificar") + ". " + LEYENDA_ESPECIALES;
  }

  // Por qué cambia el precio según el día y la hora.
  function textoDiaHora() {
    return "Hay días y horarios más baratos: de lunes a jueves pagas " + Math.round((1 - T.factorLunesAJueves) * 100) +
      "% menos, y las mudanzas que inician a las " + T.horariosNoche.join(" o ") + " cuestan " +
      Math.round((T.factorNoche - 1) * 100) + "% más.";
  }

  function textoAccesoCosto(p) {
    var partes = [];
    if (p.sinEstacionar) partes.push("No tener estacionamiento en la entrada cuesta " + pesos(T.accesoSinEstacionar) + " adicionales por camioneta en cada punto, origen o destino.");
    if (p.pisoAlto) partes.push("Subir o bajar por escalera, a partir del 2.º piso sin elevador, cuesta " + pesos(T.accesoPorPiso) + " adicionales por camioneta por cada piso, en origen y en destino.");
    return partes.join(" ");
  }

  function textoVigencia() {
    return "Esta cotización tiene una vigencia de " + T.vigenciaDias + " días naturales.";
  }

  // Textos de tiempo y embalado. El embalado no se calcula aquí: se cotiza aparte.
  function textoTiempo() {
    var extra = T.precioHoraExtra ? pesos(T.precioHoraExtra) + " por hora" : "[precio por definir]";
    return "Incluye hasta " + T.horasIncluidas + " horas de servicio. Cada hora extra: " + extra + ".";
  }

  function textoEmbalado() {
    if (T.precioEmbalado) return "Embalado: " + pesos(T.precioEmbalado) + ". El embalado alarga el servicio y puede requerir horas extra.";
    return "Embalado: tiene costo adicional y no está incluido en esta estimación; un ejecutivo te lo cotiza aparte. El embalado alarga el servicio y puede requerir horas extra.";
  }

  function crear(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function leer() {
    var tipo = campo("tipo").value;
    var hayEspeciales = visible(campo("hayEspeciales")) && campo("hayEspeciales").value === "si";
    var marcados = function (nombre) {
      return Array.prototype.filter.call(form.querySelectorAll('[name="' + nombre + '"]'), function (el) {
        return visible(el) && el.checked;
      }).map(function (el) { return el.value; });
    };
    return {
      faltaEspeciales: visible(campo("hayEspeciales")) && campo("hayEspeciales").value === "",
      electro: marcados("electro"),
      tipo: tipo,
      tipoTexto: campo("tipo").options[campo("tipo").selectedIndex].text,
      origen: campo("origen").value,
      destino: campo("destino").value,
      interiores: INTERIORES.filter(function (n) { return visible(campo(n)) && campo(n).value; })
        .map(function (n) { return NOMBRES[n] + ": " + campo(n).value; }),
      hayEspeciales: hayEspeciales,
      especiales: hayEspeciales ? marcados("especial") : [],
      cajas: marcado("cajas"),
      embalado: marcado("embalado"),
      fecha: campo("fecha").value,
      horario: campo("horario").value,
      origenColonia: campo("origenColonia").value.trim(), origenCP: campo("origenCP").value.trim(),
      destinoColonia: campo("destinoColonia").value.trim(), destinoCP: campo("destinoCP").value.trim(),
      accesoOrigen: {
        sinEstacionar: marcado("origenSinEstacionar"), depto: clase(tipo) === "depto",
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

  function textoResultado(r) {
    if (r.camino === "cotizacion") {
      var linea = function (p) {
        return textoCamionetas(p.camionetas) + " " + pesos(p.total) + " (" + p.personas + " cargadores)";
      };
      return "Estimación: mínimo " + linea(r.base) + (r.alterno ? "; máximo " + linea(r.alterno) : "");
    }
    if (r.camino === "llamada") return "Cotizar por llamada (" + r.motivo + ")";
    if (r.camino === "incompleto") return "Sin estimación: falta " + r.falta;
    return "Requiere visita previa (estimado: " + textoCamionetas(r.camionetas) + ")";
  }

  // Lo que recibe Mudara con la solicitud.
  function resumen(d, r) {
    var extras = [d.embalado ? "embalado" : "", d.cajas ? "renta de cajas de plástico" : ""].filter(Boolean);
    return [
      "Tipo: " + d.tipoTexto,
      "Interiores: " + (d.interiores.join("; ") || "—"),
      "Electrodomésticos que viajan: " + (d.electro.join(", ") || "ninguno"),
      "Objetos especiales (cotizar aparte): " + (d.faltaEspeciales ? "sin responder" : d.hayEspeciales ? d.especiales.join(", ") || "sí, sin especificar" : "no"),
      "Extras: " + (extras.join(", ") || "—"),
      "Origen: " + [d.origenColonia || "—", d.origen || "—", "CP " + (d.origenCP || "—")].join(", ") + " (" + textoAcceso(d.accesoOrigen) + ")",
      "Destino: " + [d.destinoColonia || "—", d.destino || "—", "CP " + (d.destinoCP || "—")].join(", ") + " (" + textoAcceso(d.accesoDestino) + ")",
      "Fecha: " + (d.fecha || "—") + ", " + d.horario + " h",
      textoResultado(r)
    ].join("\n");
  }

  // Mensaje para el cliente, que Alex revisa antes de enviar.
  function borrador(d, r) {
    var lineas = ["Hola, esta es tu cotización de Mudara:", "", "Lo que nos dijiste que se mueve:", d.tipoTexto];
    lineas = lineas.concat(d.interiores);
    lineas.push("Electrodomésticos que viajan: " + (d.electro.join(", ") || "ninguno"));
    lineas.push("", "Fecha: " + d.fecha + ", " + d.horario + " h");
    lineas.push("", "En " + textoCamionetas(r.base.camionetas) + ": " + pesos(r.base.total) + ". " + textoPersonal(r.base) + ".");
    if (r.alterno) lineas.push("Si hacen falta " + textoCamionetas(r.alterno.camionetas) + ": " + pesos(r.alterno.total) + ". " + textoPersonal(r.alterno) + ".");
    lineas.push("", textoDiaHora());
    if (r.base.acceso) lineas.push(textoAccesoCosto(r.base));
    lineas.push("", textoTiempo());
    if (d.embalado) lineas.push(textoEmbalado());
    if (d.cajas) lineas.push(textoCajas());
    if (d.hayEspeciales) lineas.push(textoEspeciales(d));
    lineas.push("", "Los precios incluyen IVA. Si aparecen cosas extra, se cotizan aparte antes de cargarlas.");
    lineas.push(textoVigencia());
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
    tarjeta.appendChild(crear("p", "personal", textoPersonal(p)));
    var lista = crear("dl", "desglose");
    var fila = function (nombre, valor) {
      lista.appendChild(crear("dt", "", nombre));
      lista.appendChild(crear("dd", "", valor));
    };
    var porCamioneta = " por camioneta × " + p.necesarias;
    var puntos = function (n) { return n === 2 ? ", en origen y destino" : ""; };
    fila("Carga (" + textoCamionetas(p.camionetas) + " × " + pesos(T.precioCamioneta) + ")", pesos(p.carga));
    fila("Gasolina (" + pesos(T.gasolinaPorCamioneta) + porCamioneta + ")", pesos(p.gasolina));
    if (p.sinEstacionar) fila("Sin estacionamiento en la entrada (" + pesos(T.accesoSinEstacionar) + porCamioneta + puntos(p.puntosSinEstacionar) + ")", pesos(p.sinEstacionar));
    if (p.pisoAlto) fila("Pisos sin elevador (" + pesos(T.accesoPorPiso) + porCamioneta + " × " + p.pisosEscalera + (p.pisosEscalera === 1 ? " piso" : " pisos") + ")", pesos(p.pisoAlto));
    fila("Subtotal", pesos(p.subtotal));
    if (p.ajusteDia) fila("Descuento por ser de lunes a jueves (" + Math.round((1 - T.factorLunesAJueves) * 100) + "% menos)", "−" + pesos(-p.ajusteDia));
    if (p.ajusteHora) fila("Recargo por horario nocturno (" + Math.round((T.factorNoche - 1) * 100) + "% más)", "+" + pesos(p.ajusteHora));
    if (p.cajas) fila("Renta de cajas de plástico (sin ajuste)", pesos(p.cajas));
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
      if (campo(r.campo)) campo(r.campo).setCustomValidity("Indica " + r.falta + ".");
      mostrarAviso("Tu estimación", "Para calcularla, indica " + r.falta + ".");
    } else if (r.camino === "llamada") {
      var motivos = {
        flete: "Los fletes se cotizan por teléfono.",
        oficina: "Las mudanzas de oficina se cotizan por teléfono.",
        foranea: "Las mudanzas fuera de la Zona Metropolitana de Guadalajara se cotizan por teléfono."
      };
      mostrarAviso("Agendemos una llamada", motivos[r.motivo] + " Déjanos tus datos y te llamamos.");
    } else if (r.camino === "visita-residencial") {
      mostrarAviso("Requiere visita previa", "Estimamos " + textoCamionetas(r.camionetas) + ", así que hacemos una visita para darte el precio exacto. Cuesta " + pesos(T.visitaPrevia) + " y se abona a tu mudanza si aceptas la cotización.");
    } else if (CFG.mostrarEstimacionAlCliente === false) {
      mostrarAviso("Tu cotización", "Envía tus datos y un ejecutivo de Mudara te contacta con tu cotización.");
    } else {
      mostrarAviso("Tu estimación", "Es preliminar: va de la carga mínima a la máxima habitual para tu tipo de vivienda. Un ejecutivo de Mudara te contacta para darte la cotización precisa.");
      salida.appendChild(tarjetaPrecio(r.base, r.alterno ? "Mínimo estimado" : "Estimado"));
      if (r.alterno) salida.appendChild(tarjetaPrecio(r.alterno, "Máximo estimado"));
      if ((r.alterno || r.base).camionetas >= T.maxCamionetas) {
        salida.appendChild(crear("p", "", "Si no cabe en " + T.maxCamionetas + " camionetas, hacemos una visita previa de " + pesos(T.visitaPrevia) + "."));
      }
      salida.appendChild(crear("p", "explica", textoDiaHora()));
      if (r.base.acceso) salida.appendChild(crear("p", "explica", textoAccesoCosto(r.base)));
      salida.appendChild(crear("p", "microcopy", "Precios con IVA. " + textoTiempo() + " " + textoVigencia()));
      if (d.hayEspeciales) salida.appendChild(crear("p", "microcopy", textoEspeciales(d)));
      if (d.cajas) salida.appendChild(crear("p", "microcopy", textoCajas()));
      if (d.embalado) salida.appendChild(crear("p", "microcopy", textoEmbalado()));
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
  form.addEventListener("reset", function () { tipoPintado = null; setTimeout(pintar, 0); });
  pintar();
})();
