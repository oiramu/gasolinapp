import { useState, useEffect } from 'react'
import {
  X, Fuel, Zap, Droplets, RefreshCw, Wind,
  Send, User, MessageSquare, ChevronDown, AlertTriangle,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER, getFuelUnitLabel, FUEL_PRICE_RANGES, isPriceOutlier, formatPriceValue } from '@/lib/fuel'
import { SERVICES, SERVICE_CATEGORIES } from '@/lib/services'
import { submitPriceReport } from '@/services/reports.service'
import { cn } from '@/lib/utils'

const FUEL_ICONS = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }

function FuelToggle({ fuelType, active, onToggle, price, onPriceChange }) {
  const config   = FUEL_TYPES[fuelType]
  const Icon     = FUEL_ICONS[fuelType] || Fuel
  const isGnv    = fuelType === 'gnv'
  const unitLabel = getFuelUnitLabel(fuelType)  // 'm³' para GNV, 'galón' para el resto

  // Advertencia suave de outlier
  const numericPrice = parseFloat(price)
  const showOutlier  = active && price && !isNaN(numericPrice) && isPriceOutlier(numericPrice, fuelType)
  const range        = FUEL_PRICE_RANGES[fuelType]

  return (
    <div className={cn(
      'rounded-xl border transition-all overflow-hidden',
      active ? `${config.borderClass} bg-surface-muted/40` : 'border-white/8 bg-surface-muted/10'
    )}>
      {/* Toggle header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5"
      >
        <div className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center transition-all',
          active ? config.bgClass : 'bg-white/5'
        )}>
          <Icon size={12} className={active ? config.textClass : 'text-gray-600'} />
        </div>
        <span className={cn(
          'text-[12px] font-body font-medium flex-1 text-left transition-colors',
          active ? 'text-white' : 'text-gray-600'
        )}>
          {config.label}
        </span>

        {/* Toggle indicator */}
        <div className={cn(
          'w-9 h-5 rounded-full transition-all relative',
          active ? 'bg-fuel-500/30 border border-fuel-500/50' : 'bg-white/5 border border-white/10'
        )}>
          <div className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full transition-all',
            active ? 'left-4 bg-fuel-500' : 'left-0.5 bg-gray-600'
          )} />
        </div>
      </button>

      {/* Price input — shown when active */}
      {active && (
        <div className="px-3 pb-3">
          {/* Gas hint */}
          {isGnv && (
            <p className="text-[10px] text-orange-400/70 font-mono mb-2 flex items-center gap-1">
              <Wind size={9} />
              El Gas se mide en metros cúbicos (m³)
            </p>
          )}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">$</span>
            <input
              type="number"
              step="1"
              min={range?.min ?? 0}
              max={range?.max ?? 99999}
              placeholder={isGnv ? '2500' : '15000'}
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className={cn(
                'w-full bg-surface border rounded-lg pl-6 pr-20 py-2',
                'font-mono text-sm text-white placeholder-gray-700',
                'outline-none transition-colors',
                config.borderClass.replace('/40', '/60'),
                `focus:${config.borderClass}`
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px] font-mono">
              COP/{isGnv ? 'm³' : 'gal'}
            </span>
          </div>

          {/* Advertencia suave de outlier (no bloquea el envío) */}
          {showOutlier && (
            <div className="flex items-start gap-1.5 mt-2 p-2 rounded-lg bg-amber-400/8 border border-amber-400/20">
              <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                ¿Estás seguro de este precio? Parece inusual para {config.label} (esperado {formatPriceValue(range.min, 0)}–{formatPriceValue(range.max, 0)} COP/{unitLabel}).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const INITIAL_ACTIVE_FUELS = { corriente: true, extra: false, diesel: false, urea: false, gnv: false }
const INITIAL_PRICES       = { corriente: '', extra: '', diesel: '', urea: '', gnv: '' }

function getInitialServicesState(station) {
  if (!station) return {}
  const state = {}
  SERVICES.forEach(s => {
    if (station[s.key] === true) state[s.key] = true
    if (station[s.key] === false) state[s.key] = false
  })
  return state
}


export default function ReportPriceModal({ station, onSuccess }) {
  const { reportModalOpen, reportModalPreExpand, setReportModalOpen, showToast } = useAppStore()

  const [activeFuels, setActiveFuels] = useState(INITIAL_ACTIVE_FUELS)
  const [prices, setPrices]           = useState(INITIAL_PRICES)
  const [servicesState, setServicesState] = useState({})
  const [servicesExpanded, setServicesExpanded] = useState(false)
  const [comment, setComment]         = useState('')
  const [userName, setUserName]       = useState('')
  const [submitting, setSubmitting]   = useState(false)

  // Reset and initialization
  useEffect(() => {
    if (reportModalOpen) {
      setServicesState(getInitialServicesState(station))
      setServicesExpanded(reportModalPreExpand)
    }
  }, [reportModalOpen, station, reportModalPreExpand])

  const toggleFuel = (ft) => setActiveFuels((prev) => ({ ...prev, [ft]: !prev[ft] }))
  const setPrice   = (ft, val) => setPrices((prev) => ({ ...prev, [ft]: val }))

  const handleServiceTap = (key) => {
    setServicesState(prev => {
      const current = prev[key]
      let next = null
      if (current === undefined || current === null) next = true
      else if (current === true) next = false
      else if (current === false) next = null
      return { ...prev, [key]: next }
    })
  }


  const hasAnyPrice = Object.entries(prices).some(([ft, p]) => activeFuels[ft] && p && parseFloat(p) > 0)
  
  const modifiedServices = Object.entries(servicesState)
    .filter(([_, status]) => status === true || status === false)
    .reduce((acc, [key, status]) => ({ ...acc, [key]: status }), {})
    
  // Permitimos hacer submit si tiene un precio o servicios modificados
  const canSubmit = hasAnyPrice || Object.keys(modifiedServices).length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!station || !canSubmit) return

    setSubmitting(true)
    try {
      const fuelMap = {}
      for (const ft of FUEL_ORDER) {
        if (activeFuels[ft] && prices[ft]) fuelMap[ft] = prices[ft]
      }

      await submitPriceReport({
        stationId: station.id,
        fuels: fuelMap,
        comment,
        modifiedServices,
        userDisplayName: userName || 'Anónimo',
      })

      showToast('✓ ¡Reporte enviado! Gracias por contribuir.', 'success')
      setReportModalOpen(false)
      onSuccess?.()

      // Reset
      setPrices(INITIAL_PRICES)
      setComment('')
      setActiveFuels(INITIAL_ACTIVE_FUELS)
      setServicesState({})
    } catch (err) {
      showToast('Error al enviar. Intenta de nuevo.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!reportModalOpen) return null

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && setReportModalOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-surface-card border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
          <div>
            <h2 className="font-display font-bold text-[18px]">Reportar precios</h2>
            {station && (
              <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Fuel size={10} className="text-fuel-500" />
                {station.name} · {station.brand}
              </p>
            )}
          </div>
          <button onClick={() => setReportModalOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Username */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-1.5">
              Tu nombre (opcional)
            </label>
            <div className="relative">
              <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Anónimo"
                className="w-full bg-surface-muted/30 border border-white/8 rounded-lg pl-8 pr-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-fuel-500/40 transition-colors font-body"
              />
            </div>
          </div>

          {/* Fuel toggles */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-1.5">
              Combustibles disponibles & precios
            </label>
            <div className="space-y-2">
              {FUEL_ORDER.filter(ft => ft !== 'urea').map((ft) => (
                <FuelToggle
                  key={ft}
                  fuelType={ft}
                  active={activeFuels[ft]}
                  onToggle={() => toggleFuel(ft)}
                  price={prices[ft]}
                  onPriceChange={(v) => setPrice(ft, v)}
                />
              ))}
            </div>
          </div>

          {/* ── Services (Collapsible) ── */}
          <div className="border-y border-white/5 py-1">
            <button
              type="button"
              onClick={() => setServicesExpanded(!servicesExpanded)}
              className="w-full flex items-center justify-between py-2 text-left"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-md transition-all",
                  servicesExpanded ? "bg-fuel-500/10 text-fuel-500" : "bg-white/5 text-gray-500"
                )}>
                  <ChevronDown size={14} className={cn("transition-transform", !servicesExpanded && "-rotate-90")} />
                </div>
                <div>
                  <span className="text-[12px] font-bold text-white block">Servicios de la estación</span>
                  {(() => {
                    const knownCount = SERVICES.filter(s => station && station[s.key] === true).length
                    return (
                      <span className="text-[10px] text-gray-500">
                        {knownCount > 0 
                          ? `${knownCount} servicios registrados · ¿Actualizar?`
                          : '¿Qué servicios tiene esta estación?'}
                      </span>
                    )
                  })()}
                </div>
              </div>
            </button>

            {/* Grid */}
            <div className={cn(
              "grid transition-all duration-300",
              servicesExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="pt-2 pb-1 space-y-4">
                  {/* Toggles Groups */}
                  {SERVICE_CATEGORIES.map(cat => {
                    const catServices = SERVICES.filter(s => s.category === cat.id)
                    if (catServices.length === 0) return null
                    
                    return (
                      <div key={cat.id}>
                        <p className="text-[9px] uppercase font-mono font-bold text-gray-600 mb-2">{cat.label}</p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {catServices.map(s => {
                            const Icon = s.icon
                            const status = servicesState[s.key]
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => handleServiceTap(s.key)}
                                className={cn(
                                  "flex flex-col items-center justify-center p-2 rounded-xl border transition-all gap-1.5 h-16 relative overflow-hidden",
                                  status === true  ? "bg-fuel-500/20 border-fuel-500/50 text-white" :
                                  status === false ? "bg-black/40 border-white/5 text-gray-600" :
                                  "bg-surface-muted/30 border-white/5 text-gray-400 hover:bg-white/5"
                                )}
                              >
                                {status === true && (
                                  <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-xl opacity-20 bg-fuel-500" />
                                )}
                                <div className="relative">
                                  <Icon size={16} className={status === true ? "text-fuel-500" : ""} />
                                  {status === false && (
                                     <div className="absolute inset-[-4px] overflow-visible pointer-events-none">
                                        <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="w-full h-full text-red-500 opacity-80" strokeLinecap="round">
                                          <line x1="4" y1="4" x2="20" y2="20" />
                                          <line x1="20" y1="4" x2="4" y2="20" />
                                        </svg>
                                     </div>
                                  )}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-mono leading-tight text-center",
                                  status === false && "line-through text-gray-600"
                                )}>
                                  {s.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                  
                </div>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono flex items-center gap-1 mb-1.5">
              <MessageSquare size={10} />
              Comentario / Promoción
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ej: descuento con Nequi, solo efectivo hoy, cola larga…"
              rows={3}
              className="w-full bg-surface-muted/30 border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 outline-none focus:border-fuel-500/40 transition-colors font-body resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={cn(
              'w-full py-3 rounded-xl font-display font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
              canSubmit && !submitting
                ? 'bg-fuel-500 hover:bg-fuel-600 text-surface active:scale-[0.98]'
                : 'bg-surface-muted text-gray-600 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Send size={14} />
                Enviar reporte
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-700 text-center pb-1">
            Al reportar confirmas que los precios son correctos. Datos verificados por la comunidad.
          </p>
        </form>
      </div>
    </div>
  )
}
