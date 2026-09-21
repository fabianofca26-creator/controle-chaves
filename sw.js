// A página vem pela rede primeiro (assim uma versão nova chega na hora) e cai
// pro cache quando não há sinal — que é o caso no posto. O resto é cache-first.
const CACHE = "chaves-v3";
const ARQ = ["./", "./index.html", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQ)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const guardar = (req, res) => {
  if (res && res.ok) {
    const copia = res.clone();
    caches.open(CACHE).then(c => c.put(req, copia));
  }
  return res;
};

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  const pagina = e.request.mode === "navigate" || e.request.destination === "document";
  e.respondWith(
    pagina
      // no-store porque o GitHub Pages manda max-age=600 no HTML: sem isso o
      // "buscar na rede" era atendido pelo cache do navegador e a versão nova
      // só chegava 10 minutos depois.
      ? fetch(e.request.url, { cache: "no-store" }).then(res => guardar(e.request, res))
          .catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
      : caches.match(e.request).then(hit => hit || fetch(e.request).then(res => guardar(e.request, res)))
  );
});
