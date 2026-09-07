/* ============================================================
   Home & Pet Deco — lógica de la tienda
   Carrito en localStorage + checkout por WhatsApp.
   ============================================================ */
(function () {
  "use strict";

  const $  = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const CART_KEY = "hpd_cart_v1";

  /* ---------------- Utilidades ---------------- */

  const money = (n) =>
    CONFIG.simbolo +
    new Intl.NumberFormat(CONFIG.locale, { maximumFractionDigits: 0 }).format(n);

  const producto = (id) => PRODUCTOS.find((p) => p.id === id);

  const imagen = (id) => "assets/img/" + id + ".svg";

  const colorNombre = (cid) => (COLORES[cid] ? COLORES[cid].nombre : "");

  function toast(msg) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => el.classList.add("is-visible"));
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-visible"), 2200);
  }

  /* ---------------- Carrito ---------------- */

  const Cart = {
    items: [],

    load() {
      try {
        const raw = localStorage.getItem(CART_KEY);
        this.items = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.items = [];
      }
      // Descarta líneas de productos que ya no existen en el catálogo.
      this.items = this.items.filter((i) => producto(i.id));
      return this.items;
    },

    save() {
      try {
        localStorage.setItem(CART_KEY, JSON.stringify(this.items));
      } catch (e) {
        /* modo privado: el carrito vive solo en memoria */
      }
      render();
    },

    add(id, color, cant) {
      const p = producto(id);
      if (!p) return;
      const c = color || p.colores[0];
      const linea = this.items.find((i) => i.id === id && i.color === c);
      if (linea) linea.cant += cant || 1;
      else this.items.push({ id: id, color: c, cant: cant || 1 });
      this.save();
    },

    setCant(idx, cant) {
      if (!this.items[idx]) return;
      if (cant <= 0) this.items.splice(idx, 1);
      else this.items[idx].cant = Math.min(cant, 99);
      this.save();
    },

    quitar(idx) {
      this.items.splice(idx, 1);
      this.save();
    },

    unidades() {
      return this.items.reduce((t, i) => t + i.cant, 0);
    },

    subtotal() {
      return this.items.reduce((t, i) => {
        const p = producto(i.id);
        return t + (p ? p.precio * i.cant : 0);
      }, 0);
    },

    envio() {
      const s = this.subtotal();
      return s === 0 || s >= CONFIG.envioGratisDesde ? 0 : CONFIG.costoEnvio;
    },

    total() {
      return this.subtotal() + this.envio();
    },
  };

  /* ---------------- Checkout por WhatsApp ---------------- */

  function mensajeWhatsApp() {
    const lineas = Cart.items.map((i) => {
      const p = producto(i.id);
      return (
        "• " + i.cant + "x " + p.nombre +
        " (" + colorNombre(i.color) + ") — " + money(p.precio * i.cant)
      );
    });
    const partes = [
      "¡Hola " + CONFIG.nombre + "! Quiero hacer este pedido:",
      "",
      lineas.join("\n"),
      "",
      "Subtotal: " + money(Cart.subtotal()),
      Cart.envio() === 0 ? "Envío: bonificado" : "Envío: " + money(Cart.envio()),
      "Total: " + money(Cart.total()),
      "",
      "¿Me confirmás disponibilidad y forma de pago?",
    ];
    return partes.join("\n");
  }

  function linkWhatsApp(texto) {
    return (
      "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(texto)
    );
  }

  function checkout() {
    if (!Cart.items.length) return;
    window.open(linkWhatsApp(mensajeWhatsApp()), "_blank", "noopener");
  }

  /* ---------------- Render: tarjeta de producto ---------------- */

  function tarjeta(p) {
    const agotado = !p.stock;
    const tag = agotado
      ? '<span class="card__tag">Sin stock</span>'
      : p.etiqueta
      ? '<span class="card__tag' +
        (p.etiqueta === "Oferta" ? " card__tag--clay" : "") +
        '">' + p.etiqueta + "</span>"
      : "";
    const precio = p.precioAnterior
      ? money(p.precio) +
        ' <s style="color:var(--ink-mute);font-weight:500">' +
        money(p.precioAnterior) + "</s>"
      : money(p.precio);

    return (
      '<article class="card reveal">' +
        '<div class="card__top">' +
        '<a class="card__media" href="producto.html?id=' + p.id + '" aria-label="' + p.nombre + '">' +
          '<img src="' + imagen(p.id) + '" alt="' + p.nombre + '" width="600" height="600" loading="lazy">' +
        "</a>" +
        tag +
        (agotado
          ? ""
          : '<button class="card__add" data-add="' + p.id + '" aria-label="Agregar ' + p.nombre + ' al carrito">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>' +
            "</button>") +
        "</div>" +
        '<div class="card__body">' +
          '<a href="producto.html?id=' + p.id + '"><h3 class="card__name">' + p.nombre + "</h3></a>" +
          '<p class="card__meta">' + p.resumen + "</p>" +
          '<p class="card__price">' + precio + "</p>" +
        "</div>" +
      "</article>"
    );
  }

  function pintarGrilla(cont, lista) {
    if (!cont) return;
    cont.innerHTML = lista.length
      ? lista.map(tarjeta).join("")
      : '<p class="empty">No encontramos productos con esos filtros.</p>';
    observarReveal(cont);
  }

  /* ---------------- Render: carrito ---------------- */

  function render() {
    // Contador del header
    const n = Cart.unidades();
    $$("[data-cart-count]").forEach((el) => {
      el.textContent = n;
      el.classList.toggle("is-visible", n > 0);
    });

    const body = $("[data-cart-body]");
    if (!body) return;

    if (!Cart.items.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          "<h3>Tu carrito está vacío</h3>" +
          "<p>Todavía no agregaste nada. Empezá por lo más pedido.</p>" +
          '<a class="btn btn--primary" href="catalogo.html">Ver catálogo</a>' +
        "</div>";
    } else {
      body.innerHTML = Cart.items
        .map((i, idx) => {
          const p = producto(i.id);
          return (
            '<div class="line">' +
              '<a class="line__img" href="producto.html?id=' + p.id + '">' +
                '<img src="' + imagen(p.id) + '" alt="' + p.nombre + '" loading="lazy">' +
              "</a>" +
              '<div class="line__body">' +
                '<a href="producto.html?id=' + p.id + '"><p class="line__name">' + p.nombre + "</p></a>" +
                '<p class="line__meta">' + colorNombre(i.color) + " · " + money(p.precio) + "</p>" +
                '<div class="line__row">' +
                  '<div class="qty">' +
                    '<button data-cart-dec="' + idx + '" aria-label="Quitar una unidad">−</button>' +
                    "<span>" + i.cant + "</span>" +
                    '<button data-cart-inc="' + idx + '" aria-label="Agregar una unidad">+</button>' +
                  "</div>" +
                  '<span class="line__price">' + money(p.precio * i.cant) + "</span>" +
                "</div>" +
                '<button class="line__del" data-cart-del="' + idx + '">Eliminar</button>' +
              "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    const foot = $("[data-cart-foot]");
    if (foot) foot.hidden = !Cart.items.length;

    const totalEl = $("[data-cart-total]");
    if (totalEl) totalEl.textContent = money(Cart.total());

    const nota = $("[data-cart-note]");
    if (nota) {
      const falta = CONFIG.envioGratisDesde - Cart.subtotal();
      nota.textContent =
        Cart.envio() === 0
          ? "Envío bonificado 🎉 · El pedido se confirma por WhatsApp."
          : "Te faltan " + money(falta) + " para el envío gratis · Envío: " + money(Cart.envio());
    }
  }

  /* ---------------- Drawer, menú y overlay ---------------- */

  function abrir(el) {
    el.classList.add("is-open");
    $("[data-overlay]").classList.add("is-open");
    document.body.classList.add("is-locked");
  }

  function cerrarTodo() {
    $$(".drawer, .mobile-menu").forEach((el) => el.classList.remove("is-open"));
    const ov = $("[data-overlay]");
    if (ov) ov.classList.remove("is-open");
    document.body.classList.remove("is-locked");
  }

  /* ---------------- Animación de entrada ---------------- */

  let io;
  function observarReveal(ctx) {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal", ctx).forEach((el) => el.classList.add("is-in"));
      return;
    }
    if (!io) {
      io = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -40px 0px" }
      );
    }
    $$(".reveal", ctx).forEach((el, i) => {
      el.style.transitionDelay = Math.min(i, 6) * 45 + "ms";
      io.observe(el);
    });
  }

  /* ---------------- Página: home ---------------- */

  function initHome() {
    const cont = $("[data-grid-destacados]");
    if (!cont) return;
    pintarGrilla(cont, PRODUCTOS.filter((p) => p.destacado).slice(0, 8));
  }

  /* ---------------- Página: catálogo ---------------- */

  function initCatalogo() {
    const cont = $("[data-grid-catalogo]");
    if (!cont) return;

    const params = new URLSearchParams(location.search);
    let cat = params.get("cat") || "todos";
    let orden = "destacados";

    const chips = $$("[data-cat]");
    const contador = $("[data-count]");
    const select = $("[data-orden]");

    function aplicar() {
      let lista = PRODUCTOS.filter((p) => cat === "todos" || p.categoria === cat);
      if (orden === "precio-asc") lista = lista.slice().sort((a, b) => a.precio - b.precio);
      else if (orden === "precio-desc") lista = lista.slice().sort((a, b) => b.precio - a.precio);
      else if (orden === "nombre") lista = lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      else lista = lista.slice().sort((a, b) => Number(b.destacado) - Number(a.destacado));

      pintarGrilla(cont, lista);
      if (contador)
        contador.textContent =
          lista.length + (lista.length === 1 ? " producto" : " productos");
      chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === cat)));

      const url = new URL(location.href);
      if (cat === "todos") url.searchParams.delete("cat");
      else url.searchParams.set("cat", cat);
      history.replaceState(null, "", url);
    }

    chips.forEach((c) =>
      c.addEventListener("click", () => {
        cat = c.dataset.cat;
        aplicar();
      })
    );
    if (select)
      select.addEventListener("change", () => {
        orden = select.value;
        aplicar();
      });

    aplicar();
  }

  /* ---------------- Página: detalle de producto ---------------- */

  function initProducto() {
    const cont = $("[data-producto]");
    if (!cont) return;

    const id = new URLSearchParams(location.search).get("id");
    const p = producto(id);

    if (!p) {
      cont.innerHTML =
        '<div class="empty"><h2 class="h-m">No encontramos ese producto</h2>' +
        '<p style="margin:10px 0 20px">Puede que ya no esté disponible.</p>' +
        '<a class="btn btn--primary" href="catalogo.html">Volver al catálogo</a></div>';
      return;
    }

    document.title = p.nombre + " · " + CONFIG.nombre;
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute("content", p.descripcion.slice(0, 155));

    let color = p.colores[0];
    let cant = 1;

    const precio = p.precioAnterior
      ? money(p.precio) +
        ' <s style="font-size:16px;color:var(--ink-mute);font-weight:500">' +
        money(p.precioAnterior) + "</s>"
      : money(p.precio);

    cont.innerHTML =
      '<div class="pd__layout">' +
        '<div class="pd__media reveal">' +
          '<img src="' + imagen(p.id) + '" alt="' + p.nombre + '" width="600" height="600">' +
        "</div>" +
        '<div class="pd__head reveal">' +
          '<p class="eyebrow">' + CATEGORIAS[p.categoria].nombre + "</p>" +
          "<h1>" + p.nombre + "</h1>" +
          '<p class="pd__price">' + precio + "</p>" +
          '<p class="pd__desc">' + p.descripcion + "</p>" +

          '<div class="pd__block">' +
            "<h3>Color — <span data-color-nombre>" + colorNombre(color) + "</span></h3>" +
            '<div class="swatches" data-swatches>' +
              p.colores
                .map(
                  (c, i) =>
                    '<button class="swatch" data-color="' + c + '" aria-pressed="' + (i === 0) +
                    '" style="background:' + COLORES[c].hex + '" title="' + COLORES[c].nombre +
                    '"><span class="sr-only">' + COLORES[c].nombre + "</span></button>"
                )
                .join("") +
            "</div>" +
          "</div>" +

          '<div class="pd__block">' +
            "<h3>Detalles</h3>" +
            '<dl class="specs">' +
              "<div><dt>Medidas</dt><dd>" + p.medidas + "</dd></div>" +
              "<div><dt>Material</dt><dd>" + p.material + "</dd></div>" +
              "<div><dt>Disponibilidad</dt><dd>" + (p.stock ? p.tiempo : "Sin stock por ahora") + "</dd></div>" +
              "<div><dt>Envío</dt><dd>Gratis desde " + money(CONFIG.envioGratisDesde) + "</dd></div>" +
            "</dl>" +
          "</div>" +

          '<div class="buybar">' +
            (p.stock
              ? '<div class="qty">' +
                  '<button data-pd-dec aria-label="Quitar una unidad">−</button>' +
                  "<span data-pd-cant>1</span>" +
                  '<button data-pd-inc aria-label="Agregar una unidad">+</button>' +
                "</div>" +
                '<button class="btn btn--clay" data-pd-add>Agregar al carrito</button>'
              : '<a class="btn btn--primary btn--block" data-pd-consultar href="#">Consultar por WhatsApp</a>') +
          "</div>" +
        "</div>" +
      "</div>";

    $("[data-crumb]") && ($("[data-crumb]").textContent = p.nombre);

    $$("[data-color]", cont).forEach((b) =>
      b.addEventListener("click", () => {
        color = b.dataset.color;
        $$("[data-color]", cont).forEach((x) =>
          x.setAttribute("aria-pressed", String(x === b))
        );
        $("[data-color-nombre]", cont).textContent = colorNombre(color);
      })
    );

    const pintarCant = () => ($("[data-pd-cant]", cont).textContent = cant);
    $("[data-pd-dec]", cont) &&
      $("[data-pd-dec]", cont).addEventListener("click", () => {
        cant = Math.max(1, cant - 1);
        pintarCant();
      });
    $("[data-pd-inc]", cont) &&
      $("[data-pd-inc]", cont).addEventListener("click", () => {
        cant = Math.min(99, cant + 1);
        pintarCant();
      });
    $("[data-pd-add]", cont) &&
      $("[data-pd-add]", cont).addEventListener("click", () => {
        Cart.add(p.id, color, cant);
        toast(p.nombre + " agregado al carrito");
        abrir($("[data-drawer]"));
      });
    $("[data-pd-consultar]", cont) &&
      $("[data-pd-consultar]", cont).setAttribute(
        "href",
        linkWhatsApp("¡Hola! Quería consultar por el " + p.nombre + ". ¿Vuelve a tener stock?")
      );

    // Relacionados: misma categoría, distinto producto
    const rel = $("[data-grid-relacionados]");
    if (rel) {
      pintarGrilla(
        rel,
        PRODUCTOS.filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 4)
      );
    }
    observarReveal(cont);
  }

  /* ---------------- Enlaces dependientes de CONFIG ---------------- */

  function initConfig() {
    $$("[data-wa]").forEach((el) => {
      const t = el.dataset.wa || "¡Hola " + CONFIG.nombre + "! Quería hacerles una consulta.";
      el.setAttribute("href", linkWhatsApp(t));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });
    $$("[data-email]").forEach((el) => {
      el.setAttribute("href", "mailto:" + CONFIG.email);
      if (el.dataset.email === "texto") el.textContent = CONFIG.email;
    });
    $$("[data-ig]").forEach((el) => {
      el.setAttribute("href", CONFIG.instagramUrl);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
      if (el.dataset.ig === "texto") el.textContent = "@" + CONFIG.instagram;
    });
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
    $$("[data-envio-gratis]").forEach((el) => (el.textContent = money(CONFIG.envioGratisDesde)));
  }

  /* ---------------- Arranque ---------------- */

  function init() {
    Cart.load();
    initConfig();
    initHome();
    initCatalogo();
    initProducto();
    render();
    observarReveal(document);

    // Header con borde al hacer scroll
    const header = $(".header");
    if (header) {
      const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    // Delegación de eventos global
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-add], [data-cart-inc], [data-cart-dec], [data-cart-del], [data-open-cart], [data-open-menu], [data-close], [data-checkout]");
      if (!t) return;

      if (t.hasAttribute("data-add")) {
        e.preventDefault();
        Cart.add(t.dataset.add, null, 1);
        const p = producto(t.dataset.add);
        toast(p.nombre + " agregado al carrito");
        t.classList.add("is-done");
        setTimeout(() => t.classList.remove("is-done"), 900);
        return;
      }
      if (t.hasAttribute("data-cart-inc")) {
        const i = +t.dataset.cartInc;
        Cart.setCant(i, Cart.items[i].cant + 1);
        return;
      }
      if (t.hasAttribute("data-cart-dec")) {
        const i = +t.dataset.cartDec;
        Cart.setCant(i, Cart.items[i].cant - 1);
        return;
      }
      if (t.hasAttribute("data-cart-del")) {
        Cart.quitar(+t.dataset.cartDel);
        return;
      }
      if (t.hasAttribute("data-open-cart")) {
        e.preventDefault();
        abrir($("[data-drawer]"));
        return;
      }
      if (t.hasAttribute("data-open-menu")) {
        e.preventDefault();
        abrir($("[data-menu]"));
        return;
      }
      if (t.hasAttribute("data-close")) {
        e.preventDefault();
        cerrarTodo();
        return;
      }
      if (t.hasAttribute("data-checkout")) {
        e.preventDefault();
        checkout();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cerrarTodo();
    });

    // Cierra el menú al navegar dentro de la misma página
    $$(".mobile-menu a").forEach((a) => a.addEventListener("click", cerrarTodo));

    // Re-sincroniza si el carrito cambió en otra pestaña
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY) {
        Cart.load();
        render();
      }
    });
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
