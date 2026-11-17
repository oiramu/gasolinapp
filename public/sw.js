// Service worker de GasolinApp (4.2). Conservador a propósito: solo atiende la navegación (primero
// la red y, sin conexión, una página offline). No guarda en caché el JavaScript ni las respuestas de
// Supabase: así un deploy nuevo nunca queda tapado por una versión vieja y los precios siempre son
// los del servidor. Subir CACHE_VERSION si cambia offline.html.
const CACHE_VERSION = 'gasolinapp-offline-v1'
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)))
})
