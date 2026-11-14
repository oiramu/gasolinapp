import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { ServiceKey } from '@/features/stations/api/types'
import { SERVICE_CATEGORIES, SERVICES, type ServiceInfo } from '@/features/stations/ui/serviceCatalog'
import { cn } from '@/shared/lib/cn'

const CHEVRON_SIZE = 14
const SERVICE_ICON_SIZE = 18

export interface ServicesPickerProps {
  readonly knownCount: number
  readonly defaultExpanded: boolean
  readonly isOn: (key: ServiceKey) => boolean
  readonly onToggle: (key: ServiceKey) => void
}

function ServiceButton({ service, on, onToggle }: { readonly service: ServiceInfo; readonly on: boolean; readonly onToggle: () => void }) {
  const Icon = service.icon
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onToggle}
      className={cn(
        'flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1.5 h-16 relative overflow-hidden group active:scale-95',
        on ? 'bg-fuel-500 border-fuel-500 text-surface' : 'bg-surface-muted/30 border-white/5 text-gray-500 hover:bg-white/8 hover:border-white/10',
      )}
    >
      <Icon size={SERVICE_ICON_SIZE} className={cn('transition-transform group-hover:scale-110', on ? 'text-surface' : 'text-gray-500')} />
      <span className={cn('text-[9px] font-mono leading-tight text-center font-bold', on ? 'text-surface' : 'text-gray-600')}>{service.label}</span>
    </button>
  )
}

/** Servicios de la estación, plegable. Cada toque propone el valor contrario al que se ve. */
export function ServicesPicker({ knownCount, defaultExpanded, isOn, onToggle }: ServicesPickerProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const summary = knownCount > 0 ? `${String(knownCount)} servicios registrados · ¿Actualizar?` : '¿Qué servicios tiene esta estación?'

  return (
    <div className="border-y border-white/5 py-1">
      <button type="button" aria-expanded={expanded} onClick={() => { setExpanded(!expanded) }} className="w-full flex items-center gap-2 py-2 text-left">
        <div className={cn('p-1 rounded-md transition-all', expanded ? 'bg-fuel-500/10 text-fuel-500' : 'bg-white/5 text-gray-500')}>
          <ChevronDown size={CHEVRON_SIZE} className={cn('transition-transform', !expanded && '-rotate-90')} />
        </div>
        <div>
          <span className="text-[12px] font-bold text-white block">Servicios de la estación</span>
          <span className="text-[10px] text-gray-500">{summary}</span>
        </div>
      </button>

      {expanded && (
        <div className="pt-2 pb-1 space-y-4">
          {SERVICE_CATEGORIES.map((category) => (
            <div key={category.id}>
              <p className="text-[9px] uppercase font-mono font-bold text-gray-600 mb-2">{category.label}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {SERVICES.filter((service) => service.category === category.id).map((service) => (
                  <ServiceButton key={service.key} service={service} on={isOn(service.key)} onToggle={() => { onToggle(service.key) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
