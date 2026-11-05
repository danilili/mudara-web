// Datos editables de Mudara. Cambia un valor, guarda y el sitio se actualiza.
// Lo marcado [PENDIENTE] se confirma con Alex: nunca pongas datos inventados.
window.MUDARA_CONFIG = {
  whatsapp: "",                 // 10 dígitos, sin +52. Ej: "3312345678"  [PENDIENTE]
  correo: "",                   // ej: "contacto@mudara.com.mx"           [PENDIENTE]
  horario: "",                  // ej: "Lunes a sábado, 8:00 a 19:00"     [PENDIENTE]
  tiempoRespuesta: "",          // ej: "15 minutos"                       [PENDIENTE]
  anticipoPorcentaje: null,     // número, ej: 30                         [PENDIENTE]
  mudanzasRealizadas: null,     // número, ej: 500 → se muestra "500+"    [PENDIENTE]
  ciudadesFrecuentes: [],       // ej: ["Guadalajara", "Zapopan"]         [PENDIENTE]
  mostrarResenas: false,
  resenas: [],                  // [{ texto, nombre, colonia }] — solo reseñas reales
  urlResenasGoogle: "",         // enlace "Ver reseñas en Google"         [PENDIENTE]
  mensajeWhatsApp: "Hola, quiero cotizar una mudanza.",

  // Dirección que recibe el formulario y lo manda al correo (ver README). [PENDIENTE]
  formularioEndpoint: "",

  // Dirección final del sitio, cuando exista el dominio.                  [PENDIENTE]
  urlSitio: "",

  // true: muestra el aviso de revisión y los datos pendientes como placeholder.
  // false (al lanzar): oculta lo que siga vacío, reseñas incluidas.
  modoRevision: true
};
