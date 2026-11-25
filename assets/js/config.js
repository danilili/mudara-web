// Datos editables de Mudara. Cambia un valor, guarda y el sitio se actualiza.
// Lo marcado [PENDIENTE] se confirma con Alex: nunca pongas datos inventados.
window.MUDARA_CONFIG = {
  whatsapp: "",                 // 10 dígitos, sin +52. Ej: "3312345678"  [PENDIENTE]
  correo: "",                   // ej: "contacto@mudara.com.mx"           [PENDIENTE]
  horario: "",                  // ej: "Lunes a sábado, 8:00 a 19:00"     [PENDIENTE]
  tiempoRespuesta: "",          // ej: "15 minutos"                       [PENDIENTE]
  anticipoPorcentaje: 20,       // número: anticipo para apartar la fecha (dato de Alex)
  mudanzasRealizadas: null,     // número, ej: 500 → se muestra "500+"    [PENDIENTE]
  ciudadesFrecuentes: [],       // ej: ["Guadalajara", "Zapopan"]         [PENDIENTE]
  mostrarResenas: false,
  resenas: [],                  // [{ texto, nombre, colonia }] — solo reseñas reales
  urlResenasGoogle: "",         // enlace "Ver reseñas en Google"         [PENDIENTE]
  mensajeWhatsApp: "Hola, ya llené el cotizador de Mudara.",

  // Dirección que recibe el formulario y lo manda al correo (ver README). [PENDIENTE]
  formularioEndpoint: "",

  // Dirección final del sitio.
  urlSitio: "https://mudara.com.mx",

  // true: muestra el aviso de revisión y los datos pendientes como placeholder.
  // false (al lanzar): oculta lo que siga vacío, reseñas incluidas.
  modoRevision: true,

  // false: el cliente no ve precios en el sitio; solo los recibe de Mudara por WhatsApp.
  mostrarEstimacionAlCliente: true,

  // Tarifas del cotizador. Los marcados [SUPUESTO] faltan por confirmar con Alex.
  tarifas: {
    precioCamioneta: 4500,
    gasolinaPorCamioneta: 200,  // cuota fija por camioneta necesaria
    accesoSinEstacionar: 500,   // por camioneta necesaria, en cada punto sin estacionamiento en la entrada
    accesoPorPiso: 200,         // por camioneta necesaria, por cada piso que se sube o baja sin elevador, en cada punto.
                                // [SUPUESTO] 2.º piso = 1 piso ($200), 3.er piso = 2 ($400)...; se suma al cargo de estacionamiento
    cajasPorCamioneta: 1000,    // [SUPUESTO] renta de 10 cajas por camioneta; el dato original era precio de venta
    cajasDiasAntes: 3,          // las cajas se entregan estos días antes de la mudanza
    cajasDiasDespues: 3,        // y se recogen estos días después
    vigenciaDias: 30,           // días naturales que dura una cotización
    cargadoresPorCamionetas: { 1: 2, 2: 3, 3: 4 }, // personal según camionetas necesarias
    visitaPrevia: 600,
    // [SUPUESTO] Carga mínima y máxima, en camionetas, según el tipo de vivienda.
    // Es lo único que mueve el precio de la carga: Alex debe calibrarlo con mudanzas reales.
    rangosCamionetas: {
      "depto-soltero": [1, 1.5],
      "depto-pareja": [1, 2],
      "depto-familiar": [1.5, 2.5],
      "casa-soltero": [1, 1.5],
      "casa-pareja": [1.5, 2.5],
      "casa-hijos": [2, 3],
      "casa-extendida": [2.5, 3]
    },
    horasIncluidas: 4,          // sin embalado; dato de Alex: 3 a 4 horas
    precioHoraExtra: null,      // [PENDIENTE] Alex
    precioEmbalado: null,       // dato de Alex: tiene costo extra, pero el cotizador no lo calcula; se cotiza aparte
    elevadorEvitaCargo: true,   // [SUPUESTO] con elevador no se cobran los pisos
    maxCamionetas: 3,
    factorLunesAJueves: 0.85,
    factorNoche: 1.4,
    horariosNoche: ["18:00", "20:00"]
  },

  // Opciones de los interiores según el tipo de vivienda. No cambian el precio:
  // son la referencia con la que Alex afina la cotización. [SUPUESTO] textos por validar con Alex.
  interiores: {
    tamanos: {
      "depto-soltero": "chico", "depto-pareja": "chico", "casa-soltero": "chico", "casa-pareja": "chico",
      "depto-familiar": "grande", "casa-hijos": "grande", "casa-extendida": "grande"
    },
    recamaras: {
      "depto-soltero": ["1 recámara", "1 recámara y cuarto de visitas", "Loft o estudio, sin recámara separada"],
      "depto-pareja": ["1 recámara", "1 recámara y cuarto de visitas", "2 recámaras"],
      "depto-familiar": ["2 recámaras", "3 recámaras", "4 recámaras o más"],
      "casa-soltero": ["1 recámara", "2 recámaras", "3 recámaras"],
      "casa-pareja": ["1 recámara", "2 recámaras", "3 recámaras"],
      "casa-hijos": ["2 recámaras", "3 recámaras", "4 recámaras o más"],
      "casa-extendida": ["3 recámaras", "4 recámaras", "5 recámaras o más"]
    },
    sala: {
      chico: ["Sin sala", "Sala pequeña (un sillón o love seat)", "Sala completa (2 o 3 piezas)"],
      grande: ["Sala pequeña (2 piezas)", "Sala completa (3 piezas)", "Sala grande, modular o dos salas"]
    },
    comedor: {
      chico: ["Sin comedor", "Barra o mesa para 2", "Comedor de 4 sillas"],
      grande: ["Comedor de 4 sillas", "Comedor de 6 sillas", "Comedor de 8 sillas o más"]
    },
    cocina: {
      chico: ["Básica (trastes y despensa esenciales)", "Equipada (más microondas y electrodomésticos chicos)", "Completa (más vajilla, alacena y despensa abundante)"],
      grande: ["Básica (trastes y despensa esenciales)", "Equipada (más microondas y electrodomésticos chicos)", "Completa (más vajilla, alacena y despensa abundante)"]
    },
    estudio: {
      chico: ["Sin estudio", "Escritorio y silla", "Estudio completo (escritorio, libreros, archivero)"],
      grande: ["Sin estudio", "Escritorio y silla", "Estudio completo (escritorio, libreros, archivero)"]
    },
    bodega: {
      chico: ["Sin bodega ni patio", "Algunas cosas (herramienta, bicicletas)", "Bodega llena o muebles de jardín"],
      grande: ["Sin bodega ni patio", "Algunas cosas (herramienta, bicicletas)", "Bodega llena o muebles de jardín"]
    }
  }
};
