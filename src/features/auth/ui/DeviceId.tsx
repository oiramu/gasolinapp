import { formatDeviceId } from '../model/deviceId'
import { useSession } from '../model/session'

const PENDING = '······'

export function DeviceIdView({ deviceId }: { readonly deviceId: string | null }) {
  return (
    <p className="text-[10px] text-gray-700 text-center font-mono">
      ID de dispositivo: <span className="text-gray-500">{deviceId ?? PENDING}</span>
    </p>
  )
}

/** Muestra el ID corto de la sesión anónima, para identificar el dispositivo en soporte. */
export function DeviceId() {
  const session = useSession()
  return <DeviceIdView deviceId={session ? formatDeviceId(session.userId) : null} />
}
