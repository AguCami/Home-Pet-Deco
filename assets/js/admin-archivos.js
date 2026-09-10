/* ============================================================
   Home & Pet Deco — fotos y empaquetado del panel
   ------------------------------------------------------------
   Tres cosas que el panel necesita y el navegador no trae:
   procesar una foto, guardarla sin llenar el almacenamiento, y
   armar un ZIP con todo para bajar de una vez.
   ============================================================ */
window.HPD = (function () {
  "use strict";

  /* ---------------- Fotos ---------------- */

  const LADO = 1000;      // las tarjetas son cuadradas
  const CALIDAD = 0.82;   // buen equilibrio entre nitidez y peso

  /**
   * Recorta la foto al cuadrado central y la reduce.
   * Devuelve { dataUrl, ancho, alto, peso } listo para guardar.
   */
  function procesarFoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("Ese archivo no es una imagen."));
        return;
      }
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
      lector.onload = () => {
        const im = new Image();
        im.onerror = () => reject(new Error("No se pudo abrir la imagen."));
        im.onload = () => {
          // recorte cuadrado tomado del centro
          const lado = Math.min(im.width, im.height);
          const sx = (im.width - lado) / 2;
          const sy = (im.height - lado) / 2;
          const destino = Math.min(LADO, lado);

          const c = document.createElement("canvas");
          c.width = c.height = destino;
          const ctx = c.getContext("2d");
          ctx.fillStyle = "#FFFFFF";              // por si la original es transparente
          ctx.fillRect(0, 0, destino, destino);
          ctx.drawImage(im, sx, sy, lado, lado, 0, 0, destino, destino);

          const dataUrl = c.toDataURL("image/jpeg", CALIDAD);
          resolve({
            dataUrl,
            ancho: destino,
            alto: destino,
            peso: Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75),
            original: { ancho: im.width, alto: im.height, peso: file.size },
          });
        };
        im.src = lector.result;
      };
      lector.readAsDataURL(file);
    });
  }

  /* ---------------- Guardado de fotos (IndexedDB) ----------------
     localStorage no alcanza: son unos 5 MB en total y cada foto pesa
     cientos de kB. IndexedDB no tiene ese problema.                 */

  const BD = "hpd_fotos", ALMACEN = "fotos";
  let bd = null;

  function abrirBD() {
    if (bd) return Promise.resolve(bd);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(BD, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(ALMACEN)) {
          req.result.createObjectStore(ALMACEN);
        }
      };
      req.onsuccess = () => { bd = req.result; resolve(bd); };
      req.onerror = () => reject(req.error);
    });
  }

  function conAlmacen(modo, fn) {
    return abrirBD().then(
      (d) =>
        new Promise((resolve, reject) => {
          const tx = d.transaction(ALMACEN, modo);
          const pedido = fn(tx.objectStore(ALMACEN));
          tx.oncomplete = () => resolve(pedido && pedido.result);
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  const guardarFoto  = (nombre, dataUrl) => conAlmacen("readwrite", (a) => a.put(dataUrl, nombre));
  const leerFoto     = (nombre) => conAlmacen("readonly", (a) => a.get(nombre));
  const borrarFoto   = (nombre) => conAlmacen("readwrite", (a) => a.delete(nombre));
  const listarFotos  = () => conAlmacen("readonly", (a) => a.getAllKeys());
  const vaciarFotos  = () => conAlmacen("readwrite", (a) => a.clear());

  async function todasLasFotos() {
    const nombres = (await listarFotos()) || [];
    const salida = [];
    for (const n of nombres) salida.push({ nombre: n, dataUrl: await leerFoto(n) });
    return salida;
  }

  /* ---------------- ZIP ----------------
     Formato "store" (sin comprimir): los JPEG ya vienen comprimidos,
     así que no se gana nada y el código queda corto y sin dependencias. */

  const tablaCRC = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = tablaCRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  const bytesDeTexto = (t) => new TextEncoder().encode(t);

  function bytesDeDataUrl(dataUrl) {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
    const b = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }

  /** archivos: [{ nombre, bytes }] → Blob del ZIP */
  function armarZip(archivos) {
    const trozos = [], central = [];
    let desplazamiento = 0;

    // fecha y hora en el formato que espera el ZIP (MS-DOS)
    const ahora = new Date();
    const horaDos = (ahora.getHours() << 11) | (ahora.getMinutes() << 5) | (ahora.getSeconds() >> 1);
    const fechaDos = ((ahora.getFullYear() - 1980) << 9) | ((ahora.getMonth() + 1) << 5) | ahora.getDate();

    const n16 = (v) => new Uint8Array([v & 255, (v >> 8) & 255]);
    const n32 = (v) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255]);
    const unir = (...partes) => {
      const total = partes.reduce((s, p) => s + p.length, 0);
      const out = new Uint8Array(total);
      let i = 0;
      partes.forEach((p) => { out.set(p, i); i += p.length; });
      return out;
    };

    archivos.forEach((f) => {
      const nombre = bytesDeTexto(f.nombre);
      const crc = crc32(f.bytes);
      const cabecera = unir(
        n32(0x04034b50), n16(20), n16(0), n16(0), n16(horaDos), n16(fechaDos),
        n32(crc), n32(f.bytes.length), n32(f.bytes.length),
        n16(nombre.length), n16(0), nombre
      );
      trozos.push(cabecera, f.bytes);
      central.push(unir(
        n32(0x02014b50), n16(20), n16(20), n16(0), n16(0), n16(horaDos), n16(fechaDos),
        n32(crc), n32(f.bytes.length), n32(f.bytes.length),
        n16(nombre.length), n16(0), n16(0), n16(0), n16(0), n32(0),
        n32(desplazamiento), nombre
      ));
      desplazamiento += cabecera.length + f.bytes.length;
    });

    const dir = unir(...central);
    const fin = unir(
      n32(0x06054b50), n16(0), n16(0),
      n16(archivos.length), n16(archivos.length),
      n32(dir.length), n32(desplazamiento), n16(0)
    );
    return new Blob([unir(...trozos), dir, fin], { type: "application/zip" });
  }

  function descargarBlob(blob, nombre) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  }

  const pesoLegible = (b) =>
    b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";

  return {
    procesarFoto, guardarFoto, leerFoto, borrarFoto, listarFotos, vaciarFotos, todasLasFotos,
    armarZip, bytesDeTexto, bytesDeDataUrl, descargarBlob, pesoLegible,
  };
})();
