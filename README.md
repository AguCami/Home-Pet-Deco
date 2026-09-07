# Home & Pet Deco

Tienda web para vender objetos de decoración para el hogar y accesorios para mascotas
impresos en 3D. Está pensada **primero para el celular** y después escala a tablet y
escritorio.

Es un sitio estático: HTML, CSS y JavaScript, sin frameworks ni build. Se abre haciendo
doble clic en `index.html` y se publica gratis en GitHub Pages.

---

## ⚠️ Antes de publicar

Abrí **`assets/js/data.js`** y cambiá los datos de contacto reales:

```js
const CONFIG = {
  whatsapp: "5490000000000",        // ← TU número, formato internacional sin + ni espacios
  email: "hola@homepetdeco.com",    // ← tu mail
  instagram: "homepetdeco",         // ← tu usuario
  instagramUrl: "https://instagram.com/homepetdeco",
  ...
};
```

Hasta que lo cambies, los botones de WhatsApp apuntan a un número inventado.

---

## Qué incluye

| Página | Qué hace |
|---|---|
| `index.html` | Portada: hero, categorías, destacados, cómo trabajamos, preguntas frecuentes y contacto |
| `catalogo.html` | Catálogo completo con filtro por categoría y orden por precio o nombre |
| `producto.html?id=…` | Ficha de producto: fotos, colores, medidas, materiales y relacionados |

Además:

- **Carrito** que se guarda en el navegador (`localStorage`), sobrevive a recargas y se
  sincroniza entre pestañas.
- **Checkout por WhatsApp**: al finalizar se abre un chat con el pedido ya escrito
  (productos, colores, cantidades, envío y total).
- **Envío gratis** automático a partir de un monto configurable.
- Menú móvil a pantalla completa, botón flotante de WhatsApp, animaciones de entrada
  y soporte de `prefers-reduced-motion`.

---

## Cómo editar el catálogo

Todo el catálogo vive en `assets/js/data.js`. Para agregar un producto, copiá un bloque
y cambiale los valores:

```js
{
  id: "jarron-espiral",              // sin espacios ni acentos: también es el nombre de la imagen
  nombre: "Jarrón Espiral",
  categoria: "hogar",                // "hogar" o "mascotas"
  precio: 18900,
  precioAnterior: null,              // un número muestra el precio tachado
  etiqueta: "Best seller",           // "Oferta" se pinta en terracota; null = sin etiqueta
  destacado: true,                   // aparece en la portada
  resumen: "Vaso decorativo de líneas onduladas",
  descripcion: "Texto largo de la ficha…",
  colores: ["hueso", "arena"],       // claves de COLORES, más arriba en el mismo archivo
  medidas: "12 × 12 × 24 cm",
  material: "PLA de origen vegetal",
  tiempo: "Se imprime en 48 h",
  stock: true,                       // false muestra "Sin stock" y ofrece consultar
}
```

**La imagen se busca sola** en `assets/img/<id>.svg`. Si el producto se llama
`jarron-espiral`, su imagen tiene que ser `assets/img/jarron-espiral.svg`.

### Cambiar las imágenes por fotos reales

Las imágenes que vienen ahora son ilustraciones hechas a mano en SVG, para que el sitio
se vea completo mientras no haya fotos. Cuando tengas fotos de los productos:

1. Recortalas **cuadradas** (por ejemplo 1000 × 1000 px) y guardalas como `.jpg`.
2. Ponelas en `assets/img/` con el mismo nombre que el `id` del producto.
3. En `assets/js/app.js`, cambiá una sola línea:

```js
const imagen = (id) => "assets/img/" + id + ".svg";   // ← cambiar .svg por .jpg
```

---

## Cómo verlo en tu computadora

Doble clic en `index.html` alcanza para mirarlo. Para que funcione igual que en
producción (con las rutas y el historial del navegador), conviene levantar un servidor:

```bash
npx http-server -p 8080 .
# después abrí http://localhost:8080
```

---

## Cómo publicarlo gratis

En GitHub: **Settings → Pages → Source: Deploy from a branch**, elegí la rama `main` y
la carpeta `/ (root)`. En un par de minutos queda online en
`https://<usuario>.github.io/Home-Pet-Deco/`.

También sirve subir la carpeta entera a Netlify, Vercel o Cloudflare Pages arrastrándola.

---

## Estructura

```
index.html            portada
catalogo.html         catálogo con filtros
producto.html         ficha de producto (recibe ?id=…)
assets/
  css/styles.css      todos los estilos y el sistema de diseño
  js/data.js          ⭐ configuración del negocio y catálogo — lo único que editás seguido
  js/app.js           carrito, filtros, render y checkout
  img/*.svg           ilustraciones de producto, hero, logo y favicon
```

El encabezado, el pie y el carrito están repetidos en las tres páginas (es un sitio sin
build). Si cambiás un enlace del menú, acordate de cambiarlo en `index.html`,
`catalogo.html` y `producto.html`.

---

## La marca

El logo original está en `assets/img/logo.svg`. Pesa 1 MB (es un vector de más de dos
mil trazos con degradados), así que **el sitio no lo carga**: usa versiones PNG
recortadas al dibujo, generadas a partir de él.

| Archivo | Dónde se usa | Peso |
|---|---|---|
| `logo.svg` | Original. Para imprimir o rehacer las demás versiones | 1 MB |
| `logo-header.png` | Encabezado, menú y pie del sitio | 72 KB |
| `logo-512.png` | Imagen al compartir el sitio en redes (`og:image`) | 157 KB |
| `favicon.png` | Ícono de la pestaña del navegador | 6 KB |
| `apple-touch-icon.png` | Ícono al agregar el sitio a la pantalla de inicio en iPhone | 30 KB |

Si cambiás el logo, reemplazá `logo.svg` y volvé a generar los PNG (cualquier editor de
imágenes sirve: recortá al dibujo y exportá en esos tamaños con fondo transparente).

En el encabezado el logo va acompañado del nombre escrito en Fraunces, en dos líneas
("Home & Pet" arriba, "Deco" abajo) siguiendo la forma del logo. El encabezado arranca
alto para que el logo se aprecie y se compacta solo al hacer scroll, para no comerse
la pantalla del celular mientras se navega. El naranja del logo es `#E47416` y está en
el CSS como la variable `--naranja`.

## Paleta y tipografías

- Crema `#FBF8F3`, tinta `#211E1A`, terracota `#B4643E`, verde salvia `#7C8B72`.
- Títulos en **Fraunces**, textos en **Inter** (se cargan desde Google Fonts).

Los colores están definidos como variables CSS al principio de `assets/css/styles.css`:
cambiando `--clay` cambia el acento en todo el sitio.
