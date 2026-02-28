import { Fuel, CircleDot, MapPin } from 'lucide-react'

export default function MapLegend() {
  return (
    <div className="absolute bottom-5 left-4 z-[400] bg-surface-card/90 backdrop-blur-sm border border-white/8 rounded-xl p-3 space-y-2">
      <p className="text-[9px] uppercase tracking-wider text-gray-600 font-mono mb-2">Leyenda</p>

      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
        <div className="w-3 h-3 rounded-sm border-2 border-fuel-500" />
        Zona / promedio
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
        <div className="w-3 h-3 rounded-sm border-2 border-fuel-500 bg-fuel-500/20" />
        Estación con datos
      </div>
      <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
        <div className="w-3 h-3 rounded-sm border-2 border-gray-600" />
        Sin datos reportados
      </div>
    </div>
  )
}
