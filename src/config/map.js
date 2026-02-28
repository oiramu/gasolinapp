/**
 * Map configuration constants.
 * Centralizes all map-related magic numbers and URLs.
 */

/** Default map center [lat, lng] — Barranquilla, Colombia */
export const MAP_DEFAULT_CENTER = [10.99, -74.808]

/** Default zoom level on first load */
export const MAP_DEFAULT_ZOOM = 13

/**
 * Below this zoom level the map switches to zone cluster view.
 * At or above it, individual station markers are shown.
 */
export const MAP_CLUSTER_ZOOM_THRESHOLD = 13

/** CartoDB dark tile layer — matches the app's dark theme */
export const MAP_TILE_URL =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

export const MAP_TILE_ATTRIBUTION = '© OpenStreetMap © CARTO'
export const MAP_MAX_ZOOM = 19
