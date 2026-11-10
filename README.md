# Mudara: landing

Sitio estático (HTML, CSS y JavaScript, sin build). Estado actual: **wireframe para revisión** de alcance y contenidos.

## Editar datos del negocio

Todo lo que cambia está en `assets/js/config.js`:

1. En github.com abre el archivo y pulsa el lápiz (Edit).
2. Cambia el valor entre comillas y pulsa **Commit changes**.
3. El sitio se actualiza en cerca de un minuto.

### Número de mudanzas

Actualiza `mudanzasRealizadas` cada mes o trimestre, redondeando hacia abajo a una cifra redonda (480 → 450). Se muestra como `450+`. Con `null` o `0`, el dato se oculta.

### Reseñas

Solo reseñas reales. Llena `resenas` con `{ texto, nombre, colonia }` y pon `mostrarResenas: true`.

## Cambiar fotos

Sube los `.webp` a `assets/img/` y, en `index.html`, reemplaza cada bloque `<div class="foto">` por un `<img>` con `alt`, `width`, `height` y `loading="lazy"` (excepto la portada).

## Cambiar la marca

Colores, fuentes, radios y espaciado están en `assets/css/tokens.css`. Si Dalid define fuentes, cárgalas desde Google Fonts con `display=swap`.

## Formulario y WhatsApp

Son dos salidas independientes:

- **Formulario → correo.** GitHub Pages no puede enviar correos, así que el formulario hace un `POST` a la dirección de `formularioEndpoint`, y ese servicio manda el correo.
  - Envía `application/x-www-form-urlencoded`, con las etiquetas de `data-mensaje` como nombres de campo, más `_subject`.
  - Una respuesta 2xx cuenta como éxito. El servicio debe permitir CORS desde el dominio del sitio.
  - Si falla o está vacío, se ofrece WhatsApp con los datos ya escritos, o el correo si no hay número.
- **Botones de WhatsApp.** Abren `wa.me` con `mensajeWhatsApp`. Sin número, llevan a `#cotizar`.

Para agregar o quitar un campo, edítalo en el HTML. Si lleva `data-mensaje`, se envía solo.

## Publicación

Cada commit en `main` se publica automáticamente en GitHub Pages.

## Lista para lanzar

- [ ] Quitar `<meta name="robots" content="noindex, nofollow">` de `index.html`, `aviso-de-privacidad.html` y `terminos.html`
- [ ] Poner `modoRevision: false` y llenar `config.js`, incluido `urlSitio`
- [ ] Conectar `formularioEndpoint` y probar que llegue el correo
- [ ] Reemplazar todo lo que tenga `class="pendiente"` en los HTML
- [ ] Publicar el texto del aviso de privacidad, mencionando el servicio que procesa el formulario
- [ ] Crear el archivo `CNAME` con el dominio y configurar el DNS (hacerlo antes puede romper la URL de revisión)
- [ ] Llenar `sitemap.xml` y agregar `Sitemap:` en `robots.txt`
- [ ] Cambiar las URL de `og:image` y `twitter:image` en `index.html` al dominio final
- [ ] Reemplazar `assets/img/og.jpg`, logo, fotos y mapa de Jalisco
- [ ] Correr Lighthouse móvil sin `noindex` (objetivo: 90 o más en las cuatro categorías)
