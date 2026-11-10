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
  modoRevision: true,

  // false: el cliente no ve precios en el sitio; solo los recibe de Mudara por WhatsApp.
  mostrarEstimacionAlCliente: true,

  // Tarifas del cotizador. Los marcados [SUPUESTO] faltan por confirmar con Alex.
  tarifas: {
    precioCamioneta: 4500,
    kmPorLitro: 7,
    kmPromedio: 15,             // [SUPUESTO] distancia usada en la estimación; Alex ajusta la real
    precioGasolina: 24,         // [SUPUESTO] actualizar cada semana
    accesoPorCamioneta: 1000,
    cajasPorCamioneta: 1000,    // venta de 10 cajas de plástico por camioneta
    visitaPrevia: 600,
    horasIncluidas: 4,          // sin embalado; dato de Alex: 3 a 4 horas
    precioHoraExtra: null,      // [PENDIENTE] Alex
    precioEmbalado: null,       // [PENDIENTE] Alex: costo y tiempo que agrega
    elevadorEvitaCargo: true,   // [SUPUESTO] con elevador no se cobra el piso alto
    maxCamionetas: 3,
    camionetaPorEspacio: 0.25,  // [SUPUESTO] sin calibrar con mudanzas reales
    pasoRango: 0.5,             // [SUPUESTO] redondeo del rango
    margenRango: 0.5,           // [SUPUESTO] distancia entre los dos escenarios
    factorLunesAJueves: 0.85,
    factorNoche: 1.4,
    horariosNoche: ["18:00", "20:00"]
  }
};
