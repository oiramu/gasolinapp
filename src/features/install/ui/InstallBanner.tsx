import { X } from 'lucide-react'
import { useInstallPrompt } from '../model/useInstallPrompt'

const ICON_SIZE = 16

export interface InstallBannerViewProps {
  readonly onInstall: () => void
  readonly onDismiss: () => void
}

/** Aviso discreto bajo la barra superior: instalar o cerrarlo (vuelve en 30 días). */
export function InstallBannerView({ onInstall, onDismiss }: InstallBannerViewProps) {
  return (
    <section
      aria-label="Instalar GasolinApp"
      className="pointer-events-auto flex items-center gap-3 rounded-xl border border-fuel-500/30 bg-surface-card px-3 py-2.5 shadow-lg"
    >
      <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
      <p className="flex-1 text-xs leading-snug text-gray-300">
        <span className="font-semibold text-white">Instala GasolinApp</span> y ábrela como una app, sin buscarla en el navegador.
      </p>
      <button
        type="button"
        onClick={onInstall}
        className="h-9 shrink-0 rounded-lg bg-fuel-500 px-3 text-xs font-semibold text-surface transition-colors hover:bg-fuel-600"
      >
        Instalar
      </button>
      <button
        type="button"
        aria-label="Ahora no"
        onClick={onDismiss}
        className="-mr-1 shrink-0 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white"
      >
        <X size={ICON_SIZE} aria-hidden />
      </button>
    </section>
  )
}

/** Contenedor: solo aparece cuando conviene ofrecer la instalación. */
export function InstallBanner() {
  const { visible, install, dismiss } = useInstallPrompt()
  return visible ? <InstallBannerView onInstall={install} onDismiss={dismiss} /> : null
}
