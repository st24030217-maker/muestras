// Gil's sin internet: la primera visita con señal guarda la página, el menú, las fotos y el mapa.
// Después el menú y el pedido funcionan sin internet; el mapa muestra las calles que ya se vieron.
// Al cambiar la página, sube la VERSION para que todos reciban la nueva.
const VERSION = "gils-v3";
const MAPA = "gils-mapa-v1"; // librería y calles del mapa (se guardan conforme se ven)
const MAX_MAPA = 600; // tope de piezas del mapa guardadas, para no llenar el teléfono

const BASE = [
  "./",
  "manifest.json",
  "fonts/Oswald.ttf",
  "fonts/Rye-Regular.ttf",
  ...["fondo-portada.jpg", "fondo-tabla.jpg", "logo.png", "icono-32.png", "icono-180.png", "icono-192.png", "icono-512.png"].map((f) => "img/" + f),
  ...["acompanar", "bebida", "bolsa", "cerveza", "corte", "extra", "hamburguesa", "kg", "moto", "parrilla", "postre", "queso", "taco"].map((f) => `img/i-${f}.png`),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== MAPA).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const esMapa = (u) => u.hostname === "unpkg.com" || u.hostname.endsWith("openfreemap.org");

async function recortar() {
  const c = await caches.open(MAPA);
  const ks = await c.keys();
  for (const k of ks.slice(0, Math.max(0, ks.length - MAX_MAPA))) await c.delete(k);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);

  // La página: primero internet (para tener siempre la versión más nueva); sin señal, la guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put("./", r.clone())); return r; })
        .catch(() => caches.match("./"))
    );
    return;
  }

  // Fotos, íconos y fuentes de la página: lo guardado al instante, y se actualiza por detrás.
  if (u.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((guardado) => {
        const red = fetch(req).then((r) => { if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone())); return r; });
        return guardado || red;
      })
    );
    return;
  }

  // Mapa (librería, estilo, calles, letras): se guarda conforme se ve, para tenerlo sin señal.
  if (esMapa(u)) {
    e.respondWith(
      caches.open(MAPA).then(async (c) => {
        const guardado = await c.match(req, { ignoreVary: true });
        const red = fetch(req).then((r) => {
          if (r.ok || r.type === "opaque") c.put(req, r.clone()).then(recortar);
          return r;
        });
        if (guardado) { red.catch(() => {}); return guardado; }
        return red;
      })
    );
  }
  // Rutas (OSRM) y lo demás: directo a internet.
});
