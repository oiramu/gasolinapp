import { useState } from 'react'
import {
  X, Fuel, Zap, Droplets, RefreshCw,
  Send, User, MessageSquare, ChevronDown,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER } from '@/lib/fuel'
import { submitPriceReport } from '@/services/reports.service'
import { cn } from '@/lib/utils'

const FUEL_ICONS = { extra: Fuel, super: Zap, diesel: Droplets, urea: RefreshCw }

function FuelToggle({ fuelType, active, onToggle, price, onPriceChange }) {
  const config = FUEL_TYPES[fuelType]
  const Icon = FUEL_ICONS[fuelType]

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
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">$</span>
            <input
              type="number"
              step="0.01"
              min="0.5"
              max="20"
              placeholder="0.00"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              className={cn(
                'w-full bg-surface-DEFAULT border rounded-lg pl-6 pr-3 py-2',
                'font-mono text-sm text-white placeholder-gray-700',
                'outline-none transition-colors',
                config.borderClass.replace('/40', '/60'),
                `focus:${config.borderClass}`
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-[10px] font-mono">
              USD/gal
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportPriceModal({ station, onSuccess }) {
  const { reportModalOpen, setReportModalOpen, showToast } = useAppStore()

  const [activeFuels, setActiveFuels] = useState({ extra: true, super: false, diesel: false, urea: false })
  const [prices, setPrices] = useState({ extra: '', super: '', diesel: '', urea: '' })
  const [comment, setComment] = useState('')
  const [userName, setUserName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const toggleFuel = (ft) => setActiveFuels((prev) => ({ ...prev, [ft]: !prev[ft] }))
  const setPrice = (ft, val) => setPrices((prev) => ({ ...prev, [ft]: val }))

  const hasAnyPrice = Object.entries(prices).some(([ft, p]) => activeFuels[ft] && p && parseFloat(p) > 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!station || !hasAnyPrice) return

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
        userDisplayName: userName || 'Anónimo',
      })

      showToast('✓ ¡Precio reportado! Gracias por contribuir.', 'success')
      setReportModalOpen(false)
      onSuccess?.()

      // Reset
      setPrices({ extra: '', super: '', diesel: '', urea: '' })
      setComment('')
      setActiveFuels({ extra: true, super: false, diesel: false, urea: false })
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
            className="text-gray-500 hover:text-white transition-colors p-1">
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
              {FUEL_ORDER.map((ft) => (
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
            disabled={!hasAnyPrice || submitting}
            className={cn(
              'w-full py-3 rounded-xl font-display font-bold text-[15px] flex items-center justify-center gap-2 transition-all',
              hasAnyPrice && !submitting
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
