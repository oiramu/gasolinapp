import { Car, Coffee, CreditCard, Disc, DoorOpen, Droplet, ShoppingCart, Wrench, Zap, type LucideIcon } from 'lucide-react'
import type { ServiceKey } from '../api/types'

export type ServiceCategory = 'mecanica' | 'comodidades'

export interface ServiceInfo {
  readonly key: ServiceKey
  readonly label: string
  readonly category: ServiceCategory
  readonly icon: LucideIcon
}

export const SERVICE_CATEGORIES: readonly { readonly id: ServiceCategory; readonly label: string }[] = [
  { id: 'mecanica', label: 'LLANTAS & MECÁNICA' },
  { id: 'comodidades', label: 'COMODIDADES' },
]

/** Etiqueta e ícono de cada columna `svc_*` (el tipo exige que todas existan en la DB). */
export const SERVICES: readonly ServiceInfo[] = [
  { key: 'svc_montallantas', label: 'Montallantas', category: 'mecanica', icon: Disc },
  { key: 'svc_cambio_aceite', label: 'Cambio de aceite', category: 'mecanica', icon: Droplet },
  { key: 'svc_serviteca', label: 'Serviteca general', category: 'mecanica', icon: Wrench },
  { key: 'svc_tienda', label: 'Tienda de conveniencia', category: 'comodidades', icon: ShoppingCart },
  { key: 'svc_lavadero', label: 'Lavadero', category: 'comodidades', icon: Car },
  { key: 'svc_bano', label: 'Baño público', category: 'comodidades', icon: DoorOpen },
  { key: 'svc_cafe', label: 'Café / Restaurante', category: 'comodidades', icon: Coffee },
  { key: 'svc_electrico', label: 'Cargador eléctrico', category: 'comodidades', icon: Zap },
  { key: 'svc_atm', label: 'Cajero ATM', category: 'comodidades', icon: CreditCard },
]
