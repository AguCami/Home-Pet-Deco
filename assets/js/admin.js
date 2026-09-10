/* ============================================================
   Home & Pet Deco — panel de carga
   ------------------------------------------------------------
   Edita el catálogo con formularios y genera el data.js listo
   para subir. Mientras trabajás, guarda un borrador en este
   navegador, así no se pierde nada si cerrás la pestaña.
   ============================================================ */
(function () {
  "use strict";

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const BORRADOR = "hpd_admin_borrador_v1";

  /* Copia de trabajo: arranca de data.js o del borrador guardado. */
  let datos = { config: null, colores: null, productos: [] };
  let sel = null;            // referencia al producto abierto (no su id: el id se edita)
  let sucio = false;         // hay cambios sin exportar

  const clonar = (o) => JSON.parse(JSON.stringify(o));

  function cargar() {
    const base = {
      config: clonar(CONFIG),
      colores: clonar(COLORES),
      productos: clonar(PRODUCTOS),
    };
    try {
      const guardado = localStorage.getItem(BORRADOR);
      if (guardado) {
        const b = JSON.parse(guardado);
        if (b && Array.isArray(b.productos)) {
          datos = b;
          sucio = true;
          return true;   // había un borrador
        }
      }
    } catch (e) { /* sin borrador utilizable */ }
    datos = base;
    return false;
  }

  function guardarBorrador() {
    sucio = true;
    try { localStorage.setItem(BORRADOR, JSON.stringify(datos)); } catch (e) {}
    $("[data-aviso]").classList.add("on");
  }

  /* ---------------- Utilidades ---------------- */

  const money = (n) =>
    datos.config.simbolo +
    new Intl.NumberFormat(datos.config.locale, { maximumFractionDigits: 0 }).format(n || 0);

  const imagen = (id) => "assets/img/" + id + ".svg";

  /** Convierte "Jarrón Espiral" en "jarron-espiral". */
  function aId(texto) {
    return (texto || "")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
  }

  function productoVacio() {
    return {
      id: "", nombre: "", categoria: "hogar",
      precio: 0, precioAnterior: null, etiqueta: null, destacado: false,
      resumen: "", descripcion: "",
      colores: [Object.keys(datos.colores)[0]],
      medidas: "", material: "PLA de origen vegetal",
      tiempo: "Se imprime en 48 h", stock: true,
    };
  }

  /* ---------------- Lista lateral ---------------- */

  function pintarLista() {
    const filtro = ($("[data-buscador]").value || "").toLowerCase().trim();
    const lista = $("[data-lista]");
    const visibles = datos.productos.filter((p) =>
      !filtro || (p.nombre + " " + p.id + " " + p.resumen).toLowerCase().includes(filtro)
    );

    lista.innerHTML = visibles.length
      ? visibles.map((p) => {
          const i = datos.productos.indexOf(p);
          return (
            '<button class="item" data-abrir="' + i + '" aria-current="' + (p === sel) + '">' +
              '<img src="' + imagen(p.id) + '" alt="" onerror="this.style.visibility=\'hidden\'">' +
              "<span><b>" + (p.nombre || "(sin nombre)") + "</b>" +
              "<small>" + money(p.precio) + " · " + (CATEGORIAS[p.categoria] || {}).nombre + "</small></span>" +
              '<i class="punto ' + (p.stock ? "" : "off") + '" title="' + (p.stock ? "Con stock" : "Sin stock") + '"></i>' +
            "</button>"
          );
        }).join("")
      : '<p style="padding:20px;text-align:center;color:var(--ink-mute);font-size:13px">Sin resultados</p>';

    $("[data-total]").textContent =
      datos.productos.length + (datos.productos.length === 1 ? " producto" : " productos");
  }

  /* ---------------- Formulario ---------------- */

  function abrir(indice) {
    const p = datos.productos[indice];
    if (!p) return;
    sel = p;
    const f = $("[data-form]");
    f.hidden = false;
    $("[data-vacio]").hidden = true;

    f.nombre.value = p.nombre || "";
    f.id.value = p.id || "";
    f.categoria.value = p.categoria || "hogar";
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

    pintarColores(p.colores || []);
    pintarPrevia();
    pintarLista();
    if (window.matchMedia("(max-width: 899px)").matches) {
      f.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function pintarColores(elegidos) {
    $("[data-colores]").innerHTML = Object.entries(datos.colores)
      .map(([id, c]) =>
        '<button type="button" class="color-chip" data-color="' + id + '" aria-pressed="' +
        elegidos.includes(id) + '"><i style="background:' + c.hex + '"></i>' + c.nombre + "</button>"
      ).join("");
  }

  /** Vuelca el formulario al producto seleccionado. */
  function recoger() {
    const p = sel;
    if (!p) return null;
    const f = $("[data-form]");

    p.nombre = f.nombre.value.trim();
    const idPedido = aId(f.id.value || f.nombre.value);
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
    const marcar = (campo, mal) => {
      campo.classList.toggle("mal", mal);
      if (mal) ok = false;
    };
    marcar(f.nombre, !f.nombre.value.trim());
    marcar(f.precio, !(Number(f.precio.value) > 0));
    marcar(f.resumen, !f.resumen.value.trim());

    // el id tiene que ser único: se compara contra los demás productos, no contra el abierto
    const id = aId(f.id.value || f.nombre.value);
    const repetido = datos.productos.some((p) => p !== sel && p.id === id);
    marcar(f.id, !id || repetido);
    $("[data-error-id]").textContent = repetido
      ? "Ya hay otro producto con este identificador."
      : !id ? "Hace falta un identificador." : "";
    return ok;
  }

  function pintarPrevia() {
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
          '<div class="card__media"><img src="' + imagen(p.id) + '" alt="" onerror="this.style.opacity=.15"></div>' +
          tag +
        "</div>" +
        '<div class="card__body">' +
          '<h3 class="card__name">' + (p.nombre || "(sin nombre)") + "</h3>" +
          '<p class="card__meta">' + (p.resumen || "") + "</p>" +
          '<p class="card__price">' + precio + "</p>" +
        "</div>" +
      "</article>";
  }

  /* ---------------- Alta, baja y orden ---------------- */

  function nuevo() {
    const p = productoVacio();
    p.id = "producto-" + (datos.productos.length + 1);
    p.nombre = "Producto nuevo";
    datos.productos.push(p);
    guardarBorrador();
    abrir(datos.productos.length - 1);
  }

  function duplicar() {
    const p = sel;
    if (!p) return;
    const copia = clonar(p);
    copia.nombre = p.nombre + " (copia)";
    copia.id = aId(copia.nombre);
    let n = 2;
    while (datos.productos.some((x) => x.id === copia.id)) copia.id = aId(p.nombre) + "-" + n++;
    datos.productos.splice(datos.productos.indexOf(p) + 1, 0, copia);
    guardarBorrador();
    abrir(datos.productos.indexOf(copia));
  }

  function eliminar() {
    const p = sel;
    if (!p) return;
    if (!confirm('¿Eliminar "' + p.nombre + '"? No se puede deshacer.')) return;
    datos.productos.splice(datos.productos.indexOf(p), 1);
    sel = null;
    guardarBorrador();
    $("[data-form]").hidden = true;
    $("[data-vacio]").hidden = false;
    pintarLista();
  }

  function mover(paso) {
    const p = sel;
    if (!p) return;
    const i = datos.productos.indexOf(p), j = i + paso;
    if (j < 0 || j >= datos.productos.length) return;
    datos.productos.splice(i, 1);
    datos.productos.splice(j, 0, p);
    guardarBorrador();
    pintarLista();
  }

  /* ---------------- Generación del data.js ---------------- */

  const txt = (v) => JSON.stringify(v == null ? "" : String(v));

  function generarArchivo() {
    const c = datos.config;
    const porCategoria = (cat) => datos.productos.filter((p) => p.categoria === cat);

    const producto = (p) =>
      "  {\n" +
      '    id: ' + txt(p.id) + ",\n" +
      '    nombre: ' + txt(p.nombre) + ",\n" +
      '    categoria: ' + txt(p.categoria) + ",\n" +
      "    precio: " + (p.precio || 0) + ",\n" +
      "    precioAnterior: " + (p.precioAnterior || "null") + ",\n" +
      "    etiqueta: " + (p.etiqueta ? txt(p.etiqueta) : "null") + ",\n" +
      "    destacado: " + !!p.destacado + ",\n" +
      "    resumen: " + txt(p.resumen) + ",\n" +
      "    descripcion:\n      " + txt(p.descripcion) + ",\n" +
      "    colores: [" + p.colores.map(txt).join(", ") + "],\n" +
      "    medidas: " + txt(p.medidas) + ",\n" +
      "    material: " + txt(p.material) + ",\n" +
      "    tiempo: " + txt(p.tiempo) + ",\n" +
      "    stock: " + !!p.stock + ",\n" +
      "  },";

    const bloque = (titulo, lista) =>
      lista.length ? "\n  /* ---- " + titulo + " ---- */\n" + lista.map(producto).join("\n") : "";

    const sueltos = datos.productos.filter((p) => !CATEGORIAS[p.categoria]);

    return (
`/* ============================================================
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
  hogar: { nombre: "Hogar", slug: "hogar" },
  mascotas: { nombre: "Mascotas", slug: "mascotas" },
};

/* Colores disponibles (filamento). Se referencian por id desde cada producto. */
const COLORES = {
${Object.entries(datos.colores)
  .map(([id, col]) => "  " + id + ": { nombre: " + txt(col.nombre) + ", hex: " + txt(col.hex) + " },")
  .join("\n")}
};

const PRODUCTOS = [${bloque("HOGAR", porCategoria("hogar"))}${bloque("MASCOTAS", porCategoria("mascotas"))}${bloque("OTROS", sueltos)}
];
`);
  }

  function exportar() {
    $("[data-salida]").value = generarArchivo();
    $("[data-modal]").classList.add("on");
  }

  function descargar() {
    const blob = new Blob([generarArchivo()], { type: "text/javascript;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "data.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    sucio = false;
    $("[data-aviso]").classList.remove("on");
  }

  async function copiar() {
    const area = $("[data-salida]");
    try {
      await navigator.clipboard.writeText(area.value);
      $("[data-copiar]").textContent = "¡Copiado!";
    } catch (e) {
      area.select();                    // sin permiso de portapapeles: queda seleccionado
      $("[data-copiar]").textContent = "Copialo con Ctrl+C";
    }
    setTimeout(() => ($("[data-copiar]").textContent = "Copiar todo"), 2500);
  }

  /* ---------------- Datos del negocio ---------------- */

  function pintarConfig() {
    const f = $("[data-config]");
    Object.keys(datos.config).forEach((k) => {
      if (f[k]) f[k].value = datos.config[k];
    });
  }

  function recogerConfig() {
    const f = $("[data-config]");
    Object.keys(datos.config).forEach((k) => {
      if (!f[k]) return;
      const v = f[k].value.trim();
      datos.config[k] = v;
    });
    datos.config.instagramUrl = "https://instagram.com/" + datos.config.instagram.replace(/^@/, "");
    guardarBorrador();
  }

  /* ---------------- Arranque ---------------- */

  function init() {
    const habiaBorrador = cargar();
    pintarLista();
    pintarConfig();
    if (habiaBorrador) $("[data-aviso]").classList.add("on");

    // pestañas
    $$("[data-tab]").forEach((t) =>
      t.addEventListener("click", () => {
        $$("[data-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
        $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== t.dataset.tab));
      })
    );

    $("[data-buscador]").addEventListener("input", pintarLista);

    $("[data-lista]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-abrir]");
      if (b) abrir(+b.dataset.abrir);
    });

    // cada cambio del formulario actualiza el producto y la vista previa
    $("[data-form]").addEventListener("input", (e) => {
      if (e.target.name === "nombre" && !$("[data-form]").id.dataset.tocado) {
        $("[data-form]").id.value = aId(e.target.value);
      }
      if (e.target.name === "id") $("[data-form]").id.dataset.tocado = "1";
      recoger();
      validar();
      pintarPrevia();
      pintarLista();
      guardarBorrador();
    });

    $("[data-colores]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-color]");
      if (!b) return;
      b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
      recoger();
      guardarBorrador();
    });

    $("[data-config]").addEventListener("input", recogerConfig);

    $("[data-nuevo]").addEventListener("click", nuevo);
    $("[data-duplicar]").addEventListener("click", duplicar);
    $("[data-eliminar]").addEventListener("click", eliminar);
    $("[data-subir]").addEventListener("click", () => mover(-1));
    $("[data-bajar]").addEventListener("click", () => mover(1));
    $$("[data-exportar]").forEach((b) => b.addEventListener("click", exportar));
    $("[data-descargar]").addEventListener("click", descargar);
    $("[data-copiar]").addEventListener("click", copiar);
    $("[data-cerrar-modal]").addEventListener("click", () => $("[data-modal]").classList.remove("on"));

    $("[data-descartar]").addEventListener("click", () => {
      if (!confirm("¿Descartar todos los cambios y volver al catálogo publicado?")) return;
      localStorage.removeItem(BORRADOR);
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
