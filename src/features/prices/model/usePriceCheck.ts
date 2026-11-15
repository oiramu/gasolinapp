import { useState } from 'react'
import { useSubmitReport } from '@/features/reports/model/mutations'
import { useConfirmPrice } from '@/features/reports/model/useConfirmPrice'
import type { FuelPrice } from '@/features/stations/api/types'
import { toUserMessage } from '@/shared/api/rpcErrors'
import type { DisplayPrice } from '@/shared/domain/displayPrice'
import type { FuelType } from '@/shared/domain/fuel'
import type { Notify } from '@/shared/ui/notify'

/** Qué hace "Sí": confirmar el precio comunitario o reportar el oficial como precio de la estación. */
export type PriceCheck =
  | { readonly source: 'community'; readonly fuelType: FuelType; readonly price: number; readonly priceId: string }
  | { readonly source: 'reference'; readonly fuelType: FuelType; readonly price: number }

/** La pregunta solo aparece si hay un precio a la vista; "Sin precio" no pregunta nada. */
export function toPriceCheck(fuelType: FuelType, display: DisplayPrice, community: FuelPrice | undefined): PriceCheck | null {
  if (display.source === 'reference') return { source: 'reference', fuelType, price: display.price }
  return community ? { source: 'community', fuelType, price: community.price, priceId: community.id } : null
}

export const THANKS = '¡Gracias!'
const CHECK_FAILED = 'No se pudo guardar tu respuesta. Intenta de nuevo.'

export interface PriceCheckState {
  /** Combustibles a los que ya respondió "Sí" en esta estación (la pregunta cambia por el agradecimiento). */
  readonly isAnswered: (fuelType: FuelType) => boolean
  readonly isPending: boolean
  readonly answerYes: (check: PriceCheck) => void
}

/** "¿Sigue en $X?" / "¿Es este el precio?": responde "Sí" por la RPC que toque y avisa con un Toast. */
export function usePriceCheck(stationId: string, notify: Notify): PriceCheckState {
  const confirm = useConfirmPrice()
  const submit = useSubmitReport()
  const [answered, setAnswered] = useState<ReadonlySet<FuelType>>(() => new Set())

  const callbacks = (fuelType: FuelType) => ({
    onSuccess: () => {
      setAnswered((prev) => new Set(prev).add(fuelType))
      notify(THANKS, 'success')
    },
    onError: (error: Error) => {
      notify(toUserMessage(error, CHECK_FAILED), 'error')
    },
  })

  const answerYes = (check: PriceCheck) => {
    if (check.source === 'community') {
      confirm.mutate(check.priceId, callbacks(check.fuelType))
      return
    }
    const prices = [{ fuelType: check.fuelType, price: check.price }]
    submit.mutate({ stationId, prices, comment: '', services: {} }, callbacks(check.fuelType))
  }

  return { isAnswered: (fuelType) => answered.has(fuelType), isPending: confirm.isPending || submit.isPending, answerYes }
}
