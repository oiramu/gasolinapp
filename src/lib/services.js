import { Disc, Droplet, Wrench, ShoppingCart, Car, DoorOpen, Coffee, Zap, CreditCard } from 'lucide-react'
// Note: lucide doesn't have a drum or montallantas strictly. So using visual equivalents.
// For montallantas -> we can use rotate or something. User requested 🔄, 🛢️, 🔧 emojis but in lucide-react we use components.
// We will use standard ones. Wrench for Serviteca, Zap for electric.

export const SERVICE_CATEGORIES = [
  { id: 'mecanica', label: 'LLANTAS & MECÁNICA' },
  { id: 'comodidades', label: 'COMODIDADES' },
]

export const SERVICES = [
  // Mecánica
  { key: 'svc_montallantas', label: 'Montallantas', category: 'mecanica', icon: Disc },
  { key: 'svc_cambio_aceite', label: 'Cambio de aceite', category: 'mecanica', icon: Droplet },
  { key: 'svc_serviteca', label: 'Serviteca general', category: 'mecanica', icon: Wrench },
  // Comodidades
  { key: 'svc_tienda', label: 'Tienda de conveniencia', category: 'comodidades', icon: ShoppingCart },
  { key: 'svc_lavadero', label: 'Lavadero', category: 'comodidades', icon: Car },
  { key: 'svc_bano', label: 'Baño público', category: 'comodidades', icon: DoorOpen },
  { key: 'svc_cafe', label: 'Café / Restaurante', category: 'comodidades', icon: Coffee },
  { key: 'svc_electrico', label: 'Cargador eléctrico', category: 'comodidades', icon: Zap },
  { key: 'svc_atm', label: 'Cajero ATM', category: 'comodidades', icon: CreditCard },
]
