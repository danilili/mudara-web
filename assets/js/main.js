// Rellena los datos de config.js, abre el menú móvil y envía el formulario.
(function () {
  "use strict";

  var cfg = window.MUDARA_CONFIG || {};
  var revision = cfg.modoRevision === true;

  function vacio(v) {
    return v === null || v === undefined || v === "" || v === 0 ||
      (Array.isArray(v) && v.length === 0);
  }

  function urlWhatsApp(mensaje) {
    return "https://wa.me/52" + cfg.whatsapp + "?text=" + encodeURIComponent(mensaje);
  }

  // Datos de config en el HTML ------------------------------------------------
  var formatos = {
    mudanzasRealizadas: function (v) { return v + "+"; },
    anticipoPorcentaje: function (v) { return v + "%"; }
  };

  document.querySelectorAll("[data-config]").forEach(function (el) {
    var clave = el.getAttribute("data-config");
    var valor = cfg[clave];
    if (vacio(valor)) {
      var bloque = el.closest("[data-config-hide-if-empty]");
      if (bloque && !revision) bloque.hidden = true;
      return;
    }
    el.textContent = formatos[clave] ? formatos[clave](valor) : valor;
    el.classList.remove("pendiente");
    if (el.tagName === "A" && clave === "correo") el.href = "mailto:" + valor;
    if (el.tagName === "A" && clave === "whatsapp") el.href = urlWhatsApp(cfg.mensajeWhatsApp || "");
  });

  // Ciudades frecuentes --------------------------------------------------------
  var ciudades = document.querySelector("[data-ciudades]");
  if (ciudades) {
    if (!vacio(cfg.ciudadesFrecuentes)) {
      ciudades.textContent = "";
      cfg.ciudadesFrecuentes.forEach(function (ciudad) {
        var li = document.createElement("li");
        li.textContent = ciudad;
        ciudades.appendChild(li);
      });
    } else if (!revision) {
      ciudades.hidden = true;
    }
  }

  // Botones de WhatsApp: sin número se quedan en su ancla al formulario ---------
  if (cfg.whatsapp) {
    document.querySelectorAll("a[data-whatsapp]").forEach(function (a) {
      a.href = urlWhatsApp(cfg.mensajeWhatsApp || "");
      if (window.innerWidth >= 768) {
        a.target = "_blank";
        a.rel = "noopener";
      }
    });
  }

  // Reseñas: solo reales; fuera de revisión la sección desaparece si no hay ------
  var resenas = document.querySelector("[data-resenas]");
  if (resenas) {
    var hayResenas = cfg.mostrarResenas === true && !vacio(cfg.resenas);
    if (hayResenas) {
      var lista = resenas.querySelector("[data-resenas-lista]");
      lista.textContent = "";
      cfg.resenas.forEach(function (r) {
        var figura = document.createElement("figure");
        figura.className = "tarjeta resena";
        var cita = document.createElement("blockquote");
        cita.textContent = r.texto;
        var pie = document.createElement("figcaption");
        pie.textContent = r.nombre + (r.colonia ? " · " + r.colonia : "");
        figura.appendChild(cita);
        figura.appendChild(pie);
        lista.appendChild(figura);
      });
      var nota = resenas.querySelector("[data-resenas-nota]");
      if (nota) nota.remove();
      resenas.hidden = false;
    } else if (revision) {
      resenas.hidden = false;
    } else {
      resenas.remove();
    }
    var enlace = document.querySelector("[data-resenas-enlace]");
    if (enlace && cfg.urlResenasGoogle) {
      enlace.href = cfg.urlResenasGoogle;
      enlace.classList.remove("pendiente");
    } else if (enlace && !revision) {
      enlace.remove();
    }
  }

  // Modo revisión ---------------------------------------------------------------
  if (revision) {
    // Preguntas abiertas para que Alex vea las respuestas pendientes sin abrir una por una.
    document.querySelectorAll(".preguntas-lista details").forEach(function (d) { d.open = true; });
  } else {
    document.querySelectorAll("[data-solo-revision]").forEach(function (el) { el.remove(); });
  }

  // Año del pie -------------------------------------------------------------------
  document.querySelectorAll("[data-anio]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Menú móvil --------------------------------------------------------------------
  var botonMenu = document.querySelector("[data-menu-boton]");
  var menu = document.querySelector("[data-menu]");
  if (botonMenu && menu) {
    var ponerMenu = function (abierto) {
      menu.hidden = !abierto;
      botonMenu.setAttribute("aria-expanded", String(abierto));
      botonMenu.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    };
    botonMenu.addEventListener("click", function () { ponerMenu(menu.hidden); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) ponerMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { ponerMenu(false); botonMenu.focus(); }
    });
  }

  // Datos estructurados (los campos vacíos se omiten) ------------------------------
  var ld = {
    "@context": "https://schema.org",
    "@type": "MovingCompany",
    name: "Mudara",
    areaServed: "Jalisco, México",
    sameAs: ["https://www.instagram.com/mudara_mx", "https://www.facebook.com/mudara_mx"]
  };
  if (cfg.urlSitio) ld.url = cfg.urlSitio;
  if (cfg.whatsapp) ld.telephone = "+52" + cfg.whatsapp;
  if (cfg.correo) ld.email = cfg.correo;
  var scriptLd = document.createElement("script");
  scriptLd.type = "application/ld+json";
  scriptLd.textContent = JSON.stringify(ld);
  document.head.appendChild(scriptLd);

  // Formulario ----------------------------------------------------------------------
  // Punto único de envío: para agregar otro destino (ej. registro de leads) se toca solo aquí.
  function enviarCotizacion(datos) {
    if (!cfg.formularioEndpoint) return Promise.reject(new Error("sin-endpoint"));
    var cuerpo = new URLSearchParams(datos);
    cuerpo.append("_subject", "Nueva solicitud de cotización · Mudara");
    var control = new AbortController();
    var limite = setTimeout(function () { control.abort(); }, 15000);
    return fetch(cfg.formularioEndpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: cuerpo,
      signal: control.signal
    }).then(function (r) {
      clearTimeout(limite);
      if (!r.ok) throw new Error("respuesta-" + r.status);
    }, function (error) {
      clearTimeout(limite);
      throw error;
    });
  }

  var form = document.querySelector("[data-formulario]");
  if (!form) return;

  var estado = form.querySelector("[data-formulario-estado]");
  var botonEnviar = form.querySelector("[type=submit]");
  var textoBoton = botonEnviar.textContent;

  // Fecha: no permitir días pasados (fecha local, no UTC).
  var hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  form.querySelectorAll("input[type=date]").forEach(function (f) {
    f.min = hoy.toISOString().slice(0, 10);
  });

  // Mensajes de validación en español, definidos en cada campo con data-error.
  form.querySelectorAll("[data-error]").forEach(function (campo) {
    campo.addEventListener("invalid", function () {
      campo.setCustomValidity(campo.getAttribute("data-error"));
    });
    ["input", "change"].forEach(function (evento) {
      campo.addEventListener(evento, function () { campo.setCustomValidity(""); });
    });
  });

  // Toma los campos del HTML; agregar o quitar uno no requiere tocar este archivo.
  function leerCampos() {
    var campos = [];
    form.querySelectorAll("[name]").forEach(function (c) {
      if (!c.hasAttribute("data-mensaje")) return;
      campos.push({ nombre: c.name, etiqueta: c.getAttribute("data-mensaje"), valor: c.value.trim() });
    });
    return campos;
  }

  function mensajeWhatsApp(campos) {
    var lineas = ["Hola, quiero cotizar una mudanza."];
    campos.forEach(function (c) { lineas.push(c.etiqueta + ": " + (c.valor || "—")); });
    return lineas.join("\n");
  }

  function mostrarEstado(texto, enlace) {
    estado.textContent = texto;
    if (enlace) {
      estado.appendChild(document.createElement("br"));
      var a = document.createElement("a");
      a.href = enlace.href;
      a.textContent = enlace.texto;
      if (enlace.nuevaVentana) { a.target = "_blank"; a.rel = "noopener"; }
      estado.appendChild(a);
    }
    estado.hidden = false;
    estado.focus();
  }

  var enviando = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (enviando) return;

    // Campo trampa: solo lo llenan los bots. Se finge éxito y no se envía nada.
    var trampa = form.querySelector("[data-trampa]");
    if (trampa && trampa.value) {
      form.reset();
      mostrarEstado("Recibimos tus datos.");
      return;
    }

    var campos = leerCampos();
    var datos = {};
    campos.forEach(function (c) { datos[c.etiqueta] = c.valor; });

    enviando = true;
    botonEnviar.disabled = true;
    botonEnviar.textContent = "Enviando…";
    estado.hidden = true;

    enviarCotizacion(datos).then(function () {
      form.reset();
      mostrarEstado("Recibimos tus datos. Te escribiremos por WhatsApp para pedirte fotos o video de lo que vas a mover.");
    }).catch(function (error) {
      // Nunca perder al cliente: se ofrece WhatsApp con sus datos ya escritos.
      var enlace = cfg.whatsapp ? {
        href: urlWhatsApp(mensajeWhatsApp(campos)),
        texto: "Enviar mis datos por WhatsApp",
        nuevaVentana: window.innerWidth >= 768
      } : (cfg.correo ? { href: "mailto:" + cfg.correo, texto: "Escribir a " + cfg.correo } : null);
      var sinConectar = error && error.message === "sin-endpoint" && revision;
      mostrarEstado(sinConectar
        ? "Versión de revisión: el envío al correo todavía no está conectado, así que estos datos no se enviaron."
        : "No pudimos enviar tus datos. Tu información sigue en el formulario; inténtalo de nuevo o escríbenos.", enlace);
    }).then(function () {
      enviando = false;
      botonEnviar.disabled = false;
      botonEnviar.textContent = textoBoton;
    });
  });
})();
