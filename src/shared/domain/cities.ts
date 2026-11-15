/**
 * Clave para comparar nombres de ciudad entre fuentes: sin tildes, sin mayúsculas ni espacios
 * sobrantes. "Bogotá" (zones.city) y "BOGOTA" (otra fuente) son la misma ciudad.
 */
export function cityKey(city: string): string {
  return city.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase()
}
