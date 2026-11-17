import { Share2 } from 'lucide-react'
import type { Station } from '@/features/stations/api/types'
import type { FuelType } from '@/shared/domain/fuel'
import { cn } from '@/shared/lib/cn'
import { useShareStation, type ShareFrom } from '../model/useShareStation'

const ICON_SIZE = { icon: 16, pill: 12 } as const

/** Cada variante copia el estilo de los botones vecinos: la cabecera del panel o la tarjeta "Mejor precio". */
const VARIANTS = {
  icon: 'p-1.5 rounded-lg border border-transparent text-gray-500 hover:text-white hover:bg-white/5',
  pill: 'flex items-center gap-1 text-[10px] font-mono px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300',
} as const

export interface ShareButtonProps {
  readonly variant: keyof typeof VARIANTS
  readonly onShare: () => void
}

/** Botón "Compartir" (presentacional). En la cabecera es solo el ícono; el nombre accesible es el mismo. */
export function ShareButton({ variant, onShare }: ShareButtonProps) {
  return (
    <button type="button" aria-label="Compartir" title="Compartir por WhatsApp" onClick={onShare} className={cn('transition-colors', VARIANTS[variant])}>
      <Share2 size={ICON_SIZE[variant]} aria-hidden />
      {/* En el celular la tarjeta ya tiene tres botones: ahí solo el ícono (el nombre accesible es el mismo) */}
      {variant === 'pill' && <span className="hidden sm:inline">Compartir</span>}
    </button>
  )
}

export interface ShareStationButtonProps {
  readonly station: Station
  readonly fuelType: FuelType
  readonly from: ShareFrom
  readonly variant: ShareButtonProps['variant']
}

/** Contenedor: comparte la estación con el combustible elegido. */
export function ShareStationButton({ station, fuelType, from, variant }: ShareStationButtonProps) {
  const share = useShareStation()
  return (
    <ShareButton
      variant={variant}
      onShare={() => {
        share({ station, fuelType, from })
      }}
    />
  )
}
