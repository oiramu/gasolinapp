/**
 * Map configuration constants.
 * Centralizes all map-related magic numbers and URLs.
 */

/** Default map center [lat, lng] — Barranquilla, Colombia */
export const MAP_DEFAULT_CENTER = [10.99, -74.808]

/** Default zoom level on first load */
export const MAP_DEFAULT_ZOOM = 14

/**
 * Below this zoom level the map switches to zone cluster view.
 * At or above it, individual station markers are shown.
 */
export const MAP_CLUSTER_ZOOM_THRESHOLD = 13

/** Zoom para manejar: lo bastante cerca para ver las estaciones alrededor (GPS y enlaces directos). */
export const MAP_DRIVING_ZOOM = 16

/**
 * Esri dark basemap — matches the app's dark theme.
 * Split into a base (shading) layer and a reference (labels/roads) layer,
 * stacked in that order. No API key required.
 * CARTO's dark_all tiles (formerly used here) started requiring a paid/free
 * API key in Aug 2026 and now render an "API KEY REQUIRED" watermark.
 */
export const MAP_TILE_URL =
  'https://{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'

export const MAP_LABELS_TILE_URL =
  'https://{s}.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'

/**
 * Esri sirve las teselas solo por HTTP/1.1: el navegador abre 6 conexiones por dominio y una
 * pantalla grande pide más de 150 teselas (dos capas), que hacen cola. Los dos dominios sirven las
 * mismas teselas; repartirlas entre ambos duplica las conexiones (Leaflet elige por posición).
 */
export const MAP_TILE_SUBDOMAINS = ['services', 'server']

/**
 * Menos teselas al moverse: cargar cuando el mapa se detiene (no en cada paso del arrastre ni
 * durante la animación del zoom) y conservar más alrededor para no volver a pedirlas.
 */
export const MAP_TILE_LOADING = { updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 4 }

export const MAP_TILE_ATTRIBUTION = '© Esri © OpenStreetMap © oiramu'

/** Users can zoom in this far — Leaflet upscales tiles past MAP_TILE_MAX_NATIVE_ZOOM */
export const MAP_MAX_ZOOM = 19

/** Esri's dark canvas tiles are only cached up to this level */
export const MAP_TILE_MAX_NATIVE_ZOOM = 16
