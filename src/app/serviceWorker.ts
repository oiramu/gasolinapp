export const SERVICE_WORKER_URL = '/sw.js'

/**
 * Registra el service worker (public/sw.js) cuando la página termina de cargar, para no competir con
 * la carga del mapa. Sin soporte o si falla, la app sigue igual: solo deja de ser instalable.
 */
export function registerServiceWorker(nav: Navigator = navigator, win: Window = window): void {
  if (!('serviceWorker' in nav)) return
  win.addEventListener('load', () => {
    nav.serviceWorker.register(SERVICE_WORKER_URL).catch(() => undefined)
  })
}
