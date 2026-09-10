/* ============================================================
   Home & Pet Deco — panel de administración
   ------------------------------------------------------------
   Edita catálogo, fotos, colores y categorías. Guarda un borrador
   en este navegador y al final arma un ZIP con todo lo que hay
   que subir al sitio.
   ============================================================ */
(function () {
  "use strict";

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const BORRADOR = "hpd_admin_borrador_v2";

  let datos = { config: null, categorias: null, colores: null, productos: [] };
  let sel = null;      // referencia al producto abierto (no su id: el id se edita)
  let sucio = false;

  const clonar = (o) => JSON.parse(JSON.stringify(o));

  /* ---------------- Carga y guardado ---------------- */

  function cargar() {
    try {
      const guardado = localStorage.getItem(BORRADOR);
      if (guardado) {
        const b = JSON.parse(guardado);
        if (b && Array.isArray(b.productos)) {
          datos = b;
          datos.categorias = datos.categorias || clonar(CATEGORIAS);
          sucio = true;
          return true;
        }
      }
    } catch (e) { /* sin borrador utilizable */ }
    datos = {
      config: clonar(CONFIG),
      categorias: clonar(CATEGORIAS),
      colores: clonar(COLORES),
      productos: clonar(PRODUCTOS),
    };
    return false;
  }

  function guardar() {
    sucio = true;
    try {
      localStorage.setItem(BORRADOR, JSON.stringify(datos));
    } catch (e) {
      avisar("No se pudo guardar el borrador: el navegador se quedó sin espacio.", true);
    }
    $("[data-aviso]").classList.add("on");
    pintarResumen();
  }

  function avisar(texto, malo) {
    const el = $("[data-toast]");
    el.textContent = texto;
    el.classList.toggle("malo", !!malo);
    el.classList.add("on");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("on"), 3200);
  }

  /* ---------------- Utilidades ---------------- */

  const money = (n) =>
    datos.config.simbolo +
    new Intl.NumberFormat(datos.config.locale, { maximumFractionDigits: 0 }).format(n || 0);

  const rutaImagen = (p) => "assets/img/" + (p.imagen || p.id + ".svg");

  function aId(texto) {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  }

  /** La foto puede estar todavía en el borrador (sin subir) o ya en el sitio. */
  async function fuenteImagen(p) {
    if (p.imagen) {
      const local = await HPD.leerFoto(p.imagen);
      if (local) return local;
    }
    return rutaImagen(p);
  }

  function productoVacio() {
    return {
      id: "", nombre: "", categoria: Object.keys(datos.categorias)[0] || "hogar",
      precio: 0, precioAnterior: null, etiqueta: null, destacado: false,
      resumen: "", descripcion: "", imagen: "",
      colores: [Object.keys(datos.colores)[0]],
      medidas: "", material: "PLA de origen vegetal",
      tiempo: "Se imprime en 48 h", stock: true,
    };
  }

  /* ---------------- Resumen ---------------- */

  function pintarResumen() {
    const ps = datos.productos;
    const sinStock = ps.filter((p) => !p.stock).length;
    const sinFoto = ps.filter((p) => !p.imagen).length;
    const valor = ps.reduce((t, p) => t + (p.precio || 0), 0);
    const caja = $("[data-resumen]");
    if (!caja) return;
    caja.innerHTML = [
      ["Productos", ps.length],
      ["En la portada", ps.filter((p) => p.destacado).length],
      ["Sin stock", sinStock],
      ["Sin foto propia", sinFoto],
      ["Precio promedio", money(ps.length ? valor / ps.length : 0)],
    ].map(([t, v]) => '<div class="dato"><b>' + v + "</b><span>" + t + "</span></div>").join("");
  }

  /* ---------------- Lista ---------------- */

  function filtrados() {
    const texto = ($("[data-buscador]").value || "").toLowerCase().trim();
    const cat = $("[data-filtro-cat]").value;
    const estado = $("[data-filtro-estado]").value;
    return datos.productos.filter((p) => {
      if (texto && !(p.nombre + " " + p.id + " " + p.resumen).toLowerCase().includes(texto)) return false;
      if (cat !== "todas" && p.categoria !== cat) return false;
      if (estado === "sin-stock" && p.stock) return false;
      if (estado === "destacados" && !p.destacado) return false;
      if (estado === "sin-foto" && p.imagen) return false;
      return true;
    });
  }

  async function pintarLista() {
    const lista = $("[data-lista]");
    const visibles = filtrados();

    lista.innerHTML = visibles.length
      ? visibles.map((p) => {
          const i = datos.productos.indexOf(p);
          const cat = datos.categorias[p.categoria];
          return (
            '<button class="item" data-abrir="' + i + '" aria-current="' + (p === sel) + '">' +
              '<img data-foto-de="' + i + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
              "<span><b>" + (p.nombre || "(sin nombre)") + "</b>" +
              "<small>" + money(p.precio) + " · " + (cat ? cat.nombre : "?") + "</small></span>" +
              (p.destacado ? '<i class="estrella" title="En la portada">★</i>' : "") +
              '<i class="punto ' + (p.stock ? "" : "off") + '" title="' + (p.stock ? "Se puede comprar" : "Sin stock") + '"></i>' +
            "</button>"
          );
        }).join("")
      : '<p class="vacio-lista">Sin resultados</p>';

    $("[data-total]").textContent =
      visibles.length + (visibles.length === 1 ? " producto" : " productos") +
      (visibles.length !== datos.productos.length ? " de " + datos.productos.length : "");

    // las miniaturas pueden venir del borrador, así que se resuelven aparte
    for (const img of $$("[data-foto-de]", lista)) {
      img.src = await fuenteImagen(datos.productos[+img.dataset.fotoDe]);
    }
  }

  /* ---------------- Formulario ---------------- */

  function pintarSelectCategorias() {
    const opciones = Object.entries(datos.categorias)
      .map(([id, c]) => '<option value="' + id + '">' + c.nombre + "</option>").join("");
    $("#c-categoria").innerHTML = opciones;
    $("[data-filtro-cat]").innerHTML = '<option value="todas">Todas las categorías</option>' + opciones;
    $("[data-pct-alcance]").innerHTML = '<option value="todos">Todo el catálogo</option>' + opciones;
  }

  async function abrir(indice) {
    const p = datos.productos[indice];
    if (!p) return;
    sel = p;
    const f = $("[data-form]");
    f.hidden = false;
    $("[data-vacio]").hidden = true;

    f.nombre.value = p.nombre || "";
    f.elements.id.value = p.id || "";
    f.categoria.value = p.categoria || Object.keys(datos.categorias)[0];
    f.precio.value = p.precio || 0;
    f.precioAnterior.value = p.precioAnterior || "";
    f.etiqueta.value = p.etiqueta || "";
    f.resumen.value = p.resumen || "";
    f.descripcion.value = p.descripcion || "";
    f.medidas.value = p.medidas || "";
    f.material.value = p.material || "";
    f.tiempo.value = p.tiempo || "";
    f.destacado.checked = !!p.destacado;
    f.stock.checked = !!p.stock;

    pintarColoresDelProducto(p.colores || []);
    await pintarFoto();
    await pintarPrevia();
    await pintarLista();
    if (window.matchMedia("(max-width: 899px)").matches) {
      f.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function pintarColoresDelProducto(elegidos) {
    $("[data-colores]").innerHTML = Object.entries(datos.colores)
      .map(([id, c]) =>
        '<button type="button" class="color-chip" data-color="' + id + '" aria-pressed="' +
        elegidos.includes(id) + '"><i style="background:' + c.hex + '"></i>' + c.nombre + "</button>"
      ).join("");
  }

  function recoger() {
    const p = sel;
    if (!p) return null;
    const f = $("[data-form]");

    p.nombre = f.nombre.value.trim();
    const idPedido = aId(f.elements.id.value || f.nombre.value);
    const libre = idPedido && !datos.productos.some((x) => x !== p && x.id === idPedido);
    if (libre) p.id = idPedido;
    p.categoria = f.categoria.value;
    p.precio = Number(f.precio.value) || 0;
    p.precioAnterior = f.precioAnterior.value ? Number(f.precioAnterior.value) : null;
    p.etiqueta = f.etiqueta.value.trim() || null;
    p.resumen = f.resumen.value.trim();
    p.descripcion = f.descripcion.value.trim();
    p.medidas = f.medidas.value.trim();
    p.material = f.material.value.trim();
    p.tiempo = f.tiempo.value.trim();
    p.destacado = f.destacado.checked;
    p.stock = f.stock.checked;
    p.colores = $$("[data-color][aria-pressed=true]").map((b) => b.dataset.color);
    if (!p.colores.length) p.colores = [Object.keys(datos.colores)[0]];
    return p;
  }

  function validar() {
    const f = $("[data-form]");
    let ok = true;
    const marcar = (campo, mal) => { campo.classList.toggle("mal", mal); if (mal) ok = false; };
    marcar(f.nombre, !f.nombre.value.trim());
    marcar(f.precio, !(Number(f.precio.value) > 0));
    marcar(f.resumen, !f.resumen.value.trim());

    const id = aId(f.elements.id.value || f.nombre.value);
    const repetido = datos.productos.some((p) => p !== sel && p.id === id);
    marcar(f.elements.id, !id || repetido);
    $("[data-error-id]").textContent = repetido
      ? "Ya hay otro producto con este identificador."
      : !id ? "Hace falta un identificador." : "";
    return ok;
  }

  async function pintarPrevia() {
    const p = sel;
    if (!p) return;
    const precio = p.precioAnterior
      ? money(p.precio) + ' <s style="color:var(--ink-mute);font-weight:500">' + money(p.precioAnterior) + "</s>"
      : money(p.precio);
    const tag = !p.stock
      ? '<span class="card__tag">Sin stock</span>'
      : p.etiqueta
      ? '<span class="card__tag' + (p.etiqueta === "Oferta" ? " card__tag--clay" : "") + '">' + p.etiqueta + "</span>"
      : "";
    $("[data-previa]").innerHTML =
      '<article class="card">' +
        '<div class="card__top">' +
          '<div class="card__media"><img src="' + (await fuenteImagen(p)) + '" alt="" onerror="this.style.opacity=.15"></div>' +
          tag +
        "</div>" +
        '<div class="card__body">' +
          '<h3 class="card__name">' + (p.nombre || "(sin nombre)") + "</h3>" +
          '<p class="card__meta">' + (p.resumen || "") + "</p>" +
          '<p class="card__price">' + precio + "</p>" +
        "</div>" +
      "</article>";
  }

  /* ---------------- Fotos ---------------- */

  async function pintarFoto() {
    const p = sel;
    const caja = $("[data-foto]");
    if (!p) return;
    const propia = p.imagen ? await HPD.leerFoto(p.imagen) : null;

    if (p.imagen) {
      caja.innerHTML =
        '<img class="foto-previa" src="' + (propia || rutaImagen(p)) + '" alt="">' +
        '<div class="foto-datos">' +
          "<b>" + p.imagen + "</b>" +
          "<small>" + (propia ? "Cargada acá, se sube con el ZIP" : "Ya está en el sitio") + "</small>" +
          '<div class="foto-acciones">' +
            '<button type="button" class="btn btn--ghost" data-cambiar-foto>Cambiar</button>' +
            '<button type="button" class="btn btn--peligro" data-quitar-foto>Quitar</button>' +
          "</div>" +
        "</div>";
    } else {
      caja.innerHTML =
        '<div class="foto-vacia">' +
          "<p>Sin foto propia. Se usa la ilustración <code>" + p.id + ".svg</code> si existe.</p>" +
          '<button type="button" class="btn btn--clay" data-cambiar-foto>Subir foto</button>' +
        "</div>";
    }
  }

  async function subirFoto(file) {
    const p = sel;
    if (!p || !file) return;
    try {
      const r = await HPD.procesarFoto(file);
      const nombre = (p.id || "producto") + ".jpg";
      if (p.imagen && p.imagen !== nombre) await HPD.borrarFoto(p.imagen);
      await HPD.guardarFoto(nombre, r.dataUrl);
      p.imagen = nombre;
      guardar();
      await pintarFoto();
      await pintarPrevia();
      await pintarLista();
      avisar(
        "Foto lista: " + r.original.ancho + "×" + r.original.alto + " (" + HPD.pesoLegible(r.original.peso) +
        ") → " + r.ancho + "×" + r.alto + " (" + HPD.pesoLegible(r.peso) + ")"
      );
    } catch (e) {
      avisar(e.message || "No se pudo procesar la foto.", true);
    }
  }

  async function quitarFoto() {
    const p = sel;
    if (!p || !p.imagen) return;
    await HPD.borrarFoto(p.imagen);
    p.imagen = "";
    guardar();
    await pintarFoto();
    await pintarPrevia();
    await pintarLista();
  }

  /* ---------------- Alta, baja y orden ---------------- */

  async function nuevo() {
    const p = productoVacio();
    let n = datos.productos.length + 1;
    while (datos.productos.some((x) => x.id === "producto-" + n)) n++;
    p.id = "producto-" + n;
    p.nombre = "Producto nuevo";
    datos.productos.push(p);
    guardar();
    await abrir(datos.productos.length - 1);
  }

  async function duplicar() {
    const p = sel;
    if (!p) return;
    const copia = clonar(p);
    copia.nombre = p.nombre + " (copia)";
    copia.id = aId(copia.nombre);
    let n = 2;
    while (datos.productos.some((x) => x.id === copia.id)) copia.id = aId(p.nombre) + "-" + n++;
    copia.imagen = "";   // la foto es del original
    datos.productos.splice(datos.productos.indexOf(p) + 1, 0, copia);
    guardar();
    await abrir(datos.productos.indexOf(copia));
  }

  async function eliminar() {
    const p = sel;
    if (!p) return;
    if (!confirm('¿Eliminar "' + p.nombre + '"? No se puede deshacer.')) return;
    if (p.imagen) await HPD.borrarFoto(p.imagen);
    datos.productos.splice(datos.productos.indexOf(p), 1);
    sel = null;
    guardar();
    $("[data-form]").hidden = true;
    $("[data-vacio]").hidden = false;
    await pintarLista();
  }

  async function mover(paso) {
    const p = sel;
    if (!p) return;
    const i = datos.productos.indexOf(p), j = i + paso;
    if (j < 0 || j >= datos.productos.length) return;
    datos.productos.splice(i, 1);
    datos.productos.splice(j, 0, p);
    guardar();
    await pintarLista();
  }

  /* ---------------- Precios en masa ---------------- */

  async function ajustarPrecios() {
    const pct = Number($("[data-pct]").value);
    if (!pct) { avisar("Poné un porcentaje distinto de cero.", true); return; }
    const alcance = $("[data-pct-alcance]").value;
    const afectados = datos.productos.filter((p) => alcance === "todos" || p.categoria === alcance);
    const redondeo = Number($("[data-pct-redondeo]").value) || 1;

    if (!confirm("¿Aplicar " + (pct > 0 ? "+" : "") + pct + "% a " + afectados.length + " productos?")) return;

    afectados.forEach((p) => {
      const nuevo = p.precio * (1 + pct / 100);
      p.precio = Math.max(0, Math.round(nuevo / redondeo) * redondeo);
      if (p.precioAnterior) p.precioAnterior = Math.round((p.precioAnterior * (1 + pct / 100)) / redondeo) * redondeo;
    });
    guardar();
    await pintarLista();
    if (sel) await abrir(datos.productos.indexOf(sel));
    avisar("Precios actualizados en " + afectados.length + " productos.");
  }

  /* ---------------- Colores ---------------- */

  function pintarColores() {
    $("[data-lista-colores]").innerHTML = Object.entries(datos.colores)
      .map(([id, c]) => {
        const usos = datos.productos.filter((p) => (p.colores || []).includes(id)).length;
        return (
          '<div class="fila-color" data-color-id="' + id + '">' +
            '<input type="color" value="' + c.hex + '" data-color-hex aria-label="Color">' +
            '<input type="text" value="' + c.nombre + '" data-color-nombre aria-label="Nombre del color">' +
            '<small>' + usos + (usos === 1 ? " producto" : " productos") + "</small>" +
            '<button type="button" class="btn btn--peligro" data-borrar-color>Quitar</button>' +
          "</div>"
        );
      }).join("") || '<p class="vacio-lista">Todavía no hay colores.</p>';
  }

  function agregarColor() {
    const nombre = ($("[data-color-nuevo]").value || "").trim();
    if (!nombre) { avisar("Escribí el nombre del color.", true); return; }
    let id = aId(nombre), n = 2;
    while (datos.colores[id]) id = aId(nombre) + "-" + n++;
    datos.colores[id] = { nombre, hex: $("[data-color-nuevo-hex]").value };
    $("[data-color-nuevo]").value = "";
    guardar();
    pintarColores();
    if (sel) pintarColoresDelProducto(sel.colores || []);
    avisar('Color "' + nombre + '" agregado.');
  }

  function borrarColor(id) {
    const usos = datos.productos.filter((p) => (p.colores || []).includes(id));
    const aviso = usos.length
      ? "Ese color está en " + usos.length + " producto(s) y se va a quitar de todos. ¿Seguir?"
      : "¿Quitar el color?";
    if (!confirm(aviso)) return;
    delete datos.colores[id];
    datos.productos.forEach((p) => {
      p.colores = (p.colores || []).filter((c) => c !== id);
      if (!p.colores.length) p.colores = [Object.keys(datos.colores)[0]].filter(Boolean);
    });
    guardar();
    pintarColores();
    if (sel) pintarColoresDelProducto(sel.colores || []);
  }

  /* ---------------- Categorías ---------------- */

  function pintarCategorias() {
    $("[data-lista-categorias]").innerHTML = Object.entries(datos.categorias)
      .map(([id, c]) => {
        const usos = datos.productos.filter((p) => p.categoria === id).length;
        return (
          '<div class="fila-color" data-categoria-id="' + id + '">' +
            '<input type="text" value="' + c.nombre + '" data-categoria-nombre aria-label="Nombre de la categoría">' +
            "<small>" + usos + (usos === 1 ? " producto" : " productos") + "</small>" +
            '<button type="button" class="btn btn--peligro" data-borrar-categoria>Quitar</button>' +
          "</div>"
        );
      }).join("") || '<p class="vacio-lista">Todavía no hay categorías.</p>';
  }

  function agregarCategoria() {
    const nombre = ($("[data-categoria-nueva]").value || "").trim();
    if (!nombre) { avisar("Escribí el nombre de la categoría.", true); return; }
    let id = aId(nombre), n = 2;
    while (datos.categorias[id]) id = aId(nombre) + "-" + n++;
    datos.categorias[id] = { nombre, slug: id };
    $("[data-categoria-nueva]").value = "";
    guardar();
    pintarCategorias();
    pintarSelectCategorias();
    avisar('Categoría "' + nombre + '" agregada. Va a aparecer en los filtros del catálogo.');
  }

  function borrarCategoria(id) {
    if (Object.keys(datos.categorias).length <= 1) {
      avisar("Tiene que quedar al menos una categoría.", true);
      return;
    }
    const usos = datos.productos.filter((p) => p.categoria === id);
    const destino = Object.keys(datos.categorias).find((c) => c !== id);
    if (!confirm(
      usos.length
        ? "Hay " + usos.length + " producto(s) en esa categoría. Van a pasar a “" +
          datos.categorias[destino].nombre + "”. ¿Seguir?"
        : "¿Quitar la categoría?"
    )) return;
    usos.forEach((p) => (p.categoria = destino));
    delete datos.categorias[id];
    guardar();
    pintarCategorias();
    pintarSelectCategorias();
    pintarLista();
  }

  /* ---------------- Datos del negocio ---------------- */

  function pintarConfig() {
    const f = $("[data-config]");
    Object.keys(datos.config).forEach((k) => { if (f[k]) f[k].value = datos.config[k]; });
  }

  function recogerConfig() {
    const f = $("[data-config]");
    Object.keys(datos.config).forEach((k) => {
      if (f[k]) datos.config[k] = f[k].value.trim();
    });
    datos.config.instagramUrl = "https://instagram.com/" + (datos.config.instagram || "").replace(/^@/, "");
    guardar();
  }

  /* ---------------- Generación del archivo ---------------- */

  const txt = (v) => JSON.stringify(v == null ? "" : String(v));

  /* Una clave como "rosa-viejo" necesita comillas: sin ellas el archivo
     no es JavaScript válido y el sitio deja de cargar. */
  const clave = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : JSON.stringify(k));

  function generarArchivo() {
    const c = datos.config;
    const producto = (p) =>
      "  {\n" +
      "    id: " + txt(p.id) + ",\n" +
      "    nombre: " + txt(p.nombre) + ",\n" +
      "    categoria: " + txt(p.categoria) + ",\n" +
      "    precio: " + (p.precio || 0) + ",\n" +
      "    precioAnterior: " + (p.precioAnterior || "null") + ",\n" +
      "    etiqueta: " + (p.etiqueta ? txt(p.etiqueta) : "null") + ",\n" +
      "    destacado: " + !!p.destacado + ",\n" +
      "    resumen: " + txt(p.resumen) + ",\n" +
      "    descripcion:\n      " + txt(p.descripcion) + ",\n" +
      (p.imagen ? "    imagen: " + txt(p.imagen) + ",\n" : "") +
      "    colores: [" + (p.colores || []).map(txt).join(", ") + "],\n" +
      "    medidas: " + txt(p.medidas) + ",\n" +
      "    material: " + txt(p.material) + ",\n" +
      "    tiempo: " + txt(p.tiempo) + ",\n" +
      "    stock: " + !!p.stock + ",\n" +
      "  },";

    const bloques = Object.entries(datos.categorias).map(([id, cat]) => {
      const lista = datos.productos.filter((p) => p.categoria === id);
      return lista.length
        ? "\n  /* ---- " + cat.nombre.toUpperCase() + " ---- */\n" + lista.map(producto).join("\n")
        : "";
    }).join("");
    const sueltos = datos.productos.filter((p) => !datos.categorias[p.categoria]);

    return `/* ============================================================
   Home & Pet Deco — configuración y catálogo
   ------------------------------------------------------------
   Generado desde el panel (admin.html). Se puede editar a mano
   igual, respetando el formato.
   ============================================================ */

const CONFIG = {
  nombre: ${txt(c.nombre)},
  // Número de WhatsApp en formato internacional, sin +, espacios ni guiones.
  whatsapp: ${txt(c.whatsapp)},
  email: ${txt(c.email)},
  instagram: ${txt(c.instagram)},
  instagramUrl: ${txt(c.instagramUrl)},
  ciudad: ${txt(c.ciudad)},
  // Formato de precios
  locale: ${txt(c.locale)},
  moneda: ${txt(c.moneda)},
  simbolo: ${txt(c.simbolo)},
};

const CATEGORIAS = {
${Object.entries(datos.categorias)
  .map(([id, cat]) => "  " + clave(id) + ": { nombre: " + txt(cat.nombre) + ", slug: " + txt(cat.slug || id) + " },")
  .join("\n")}
};

/* Colores disponibles (filamento). Se referencian por id desde cada producto. */
const COLORES = {
${Object.entries(datos.colores)
  .map(([id, col]) => "  " + clave(id) + ": { nombre: " + txt(col.nombre) + ", hex: " + txt(col.hex) + " },")
  .join("\n")}
};

const PRODUCTOS = [${bloques}${sueltos.length ? "\n  /* ---- SIN CATEGORÍA ---- */\n" + sueltos.map(producto).join("\n") : ""}
];
`;
  }

  /* ---------------- Exportación ---------------- */

  async function abrirExportar() {
    const fotos = await HPD.todasLasFotos();
    const usadas = fotos.filter((f) => datos.productos.some((p) => p.imagen === f.nombre));
    $("[data-salida]").value = generarArchivo();

    const peso = usadas.reduce((t, f) => t + f.dataUrl.length * 0.75, 0);
    $("[data-resumen-zip]").innerHTML =
      "<li><b>assets/js/data.js</b> — el catálogo completo</li>" +
      (usadas.length
        ? "<li><b>" + usadas.length + " foto(s)</b> en assets/img/ — " + HPD.pesoLegible(peso) + "</li>"
        : "<li>Sin fotos nuevas para subir</li>");
    $("[data-modal]").classList.add("on");
  }

  async function descargarZip() {
    const fotos = await HPD.todasLasFotos();
    const usadas = fotos.filter((f) => datos.productos.some((p) => p.imagen === f.nombre));
    const archivos = [
      { nombre: "assets/js/data.js", bytes: HPD.bytesDeTexto(generarArchivo()) },
      ...usadas.map((f) => ({ nombre: "assets/img/" + f.nombre, bytes: HPD.bytesDeDataUrl(f.dataUrl) })),
      { nombre: "LEEME.txt", bytes: HPD.bytesDeTexto(
`Home & Pet Deco — cambios del panel

Este ZIP respeta las carpetas del sitio. Para publicarlo:

1. Descomprimilo.
2. En GitHub, entrá al repositorio y tocá "Add file" > "Upload files".
3. Arrastrá las carpetas "assets" tal cual salen del ZIP.
   GitHub va a reemplazar los archivos que ya existen.
4. Tocá "Commit changes" y esperá un par de minutos.

Generado el ${new Date().toLocaleString("es-AR")}.
`) },
    ];
    HPD.descargarBlob(HPD.armarZip(archivos), "home-pet-deco.zip");
    sucio = false;
    $("[data-aviso]").classList.remove("on");
    avisar("ZIP descargado con " + archivos.length + " archivos.");
  }

  function descargarSoloDatos() {
    HPD.descargarBlob(new Blob([generarArchivo()], { type: "text/javascript;charset=utf-8" }), "data.js");
    sucio = false;
    $("[data-aviso]").classList.remove("on");
  }

  async function copiar() {
    const area = $("[data-salida]");
    try {
      await navigator.clipboard.writeText(area.value);
      $("[data-copiar]").textContent = "¡Copiado!";
    } catch (e) {
      area.select();
      $("[data-copiar]").textContent = "Copialo con Ctrl+C";
    }
    setTimeout(() => ($("[data-copiar]").textContent = "Copiar el texto"), 2500);
  }

  /* ---------------- Arranque ---------------- */

  async function init() {
    const habiaBorrador = cargar();
    pintarSelectCategorias();
    pintarColores();
    pintarCategorias();
    pintarConfig();
    pintarResumen();
    await pintarLista();
    if (habiaBorrador) {
      $("[data-aviso]").classList.add("on");
      avisar("Retomamos el borrador guardado en este navegador.");
    }

    $$("[data-tab]").forEach((t) =>
      t.addEventListener("click", () => {
        $$("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
        $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
      })
    );

    ["[data-buscador]", "[data-filtro-cat]", "[data-filtro-estado]"].forEach((s) =>
      $(s).addEventListener("input", pintarLista)
    );

    $("[data-lista]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-abrir]");
      if (b) abrir(+b.dataset.abrir);
    });

    $("[data-form]").addEventListener("input", async (e) => {
      const f = $("[data-form]");
      if (e.target.name === "nombre" && !f.elements.id.dataset.tocado) {
        f.elements.id.value = aId(e.target.value);
      }
      if (e.target.name === "id") f.elements.id.dataset.tocado = "1";
      recoger();
      validar();
      await pintarPrevia();
      await pintarLista();
      guardar();
    });

    $("[data-colores]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
      recoger();
      guardar();
    });

    // fotos
    $("[data-foto]").addEventListener("click", (e) => {
      if (e.target.closest("[data-cambiar-foto]")) $("[data-archivo]").click();
      if (e.target.closest("[data-quitar-foto]")) quitarFoto();
    });
    $("[data-archivo]").addEventListener("change", (e) => {
      if (e.target.files[0]) subirFoto(e.target.files[0]);
      e.target.value = "";
    });

    // colores
    $("[data-agregar-color]").addEventListener("click", agregarColor);
    $("[data-lista-colores]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-borrar-color]");
      if (b) borrarColor(b.closest("[data-color-id]").dataset.colorId);
    });
    $("[data-lista-colores]").addEventListener("input", (e) => {
      const fila = e.target.closest("[data-color-id]");
      if (!fila) return;
      const c = datos.colores[fila.dataset.colorId];
      if (e.target.matches("[data-color-hex]")) c.hex = e.target.value;
      if (e.target.matches("[data-color-nombre]")) c.nombre = e.target.value;
      guardar();
      if (sel) pintarColoresDelProducto(sel.colores || []);
    });

    // categorías
    $("[data-agregar-categoria]").addEventListener("click", agregarCategoria);
    $("[data-lista-categorias]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-borrar-categoria]");
      if (b) borrarCategoria(b.closest("[data-categoria-id]").dataset.categoriaId);
    });
    $("[data-lista-categorias]").addEventListener("input", (e) => {
      const fila = e.target.closest("[data-categoria-id]");
      if (!fila || !e.target.matches("[data-categoria-nombre]")) return;
      datos.categorias[fila.dataset.categoriaId].nombre = e.target.value;
      guardar();
      pintarSelectCategorias();
      pintarLista();
    });

    $("[data-config]").addEventListener("input", recogerConfig);
    $("[data-aplicar-pct]").addEventListener("click", ajustarPrecios);

    $("[data-nuevo]").addEventListener("click", nuevo);
    $("[data-duplicar]").addEventListener("click", duplicar);
    $("[data-eliminar]").addEventListener("click", eliminar);
    $("[data-subir]").addEventListener("click", () => mover(-1));
    $("[data-bajar]").addEventListener("click", () => mover(1));
    $$("[data-exportar]").forEach((b) => b.addEventListener("click", abrirExportar));
    $("[data-descargar-zip]").addEventListener("click", descargarZip);
    $("[data-descargar-datos]").addEventListener("click", descargarSoloDatos);
    $("[data-copiar]").addEventListener("click", copiar);
    $("[data-cerrar-modal]").addEventListener("click", () => $("[data-modal]").classList.remove("on"));

    $("[data-descartar]").addEventListener("click", async () => {
      if (!confirm("¿Descartar todos los cambios y las fotos cargadas acá, y volver al catálogo publicado?")) return;
      localStorage.removeItem(BORRADOR);
      await HPD.vaciarFotos();
      location.reload();
    });

    window.addEventListener("beforeunload", (e) => {
      if (!sucio) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
