import { useEffect, useState } from 'react'
import {
  Fuel, MapPin, ThumbsUp, ThumbsDown, Plus, X,
  AlertTriangle, Clock, Tag, MessageSquare, ChevronRight,
  Droplets, Zap, Star, RefreshCw, Info, Wind, BarChart2, List
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER, getLatestPrices, hasReportedPrices, formatRelativeTime, REPORT_TYPE_LABELS, BRAND_COLORS, formatPriceValue } from '@/lib/fuel'
import { voteOnReport } from '@/services/reports.service'
import { cn } from '@/lib/utils'
import { SERVICES } from '@/lib/services'
import PriceHistoryChart from '@/components/panels/PriceHistoryChart'

const FUEL_ICONS = { corriente: Zap, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }
const REPORT_ICONS = { price: Tag, promotion: Star, warning: AlertTriangle, comment: MessageSquare, correction: Info }

function FuelCard({ fuelType, priceData, zoneAvg, hasData }) {
  const config = FUEL_TYPES[fuelType]
  const Icon = FUEL_ICONS[fuelType] || Fuel
  const isEstimate = !priceData && hasData

  return (
    <div className={cn(
      'rounded-xl border p-3 flex flex-col gap-1 transition-all relative overflow-hidden',
      priceData
        ? `bg-surface-card ${config.borderClass}`
        : 'bg-surface-muted/30 border-white/5'
    )}>
      {/* Corner accent */}
      {priceData && (
        <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-xl opacity-20"
          style={{ background: config.color }} />
      )}

      <div className="flex items-center gap-1.5">
        <Icon size={12} className={priceData ? config.textClass : 'text-gray-600'} />
        <span className="text-[10px] uppercase tracking-wider font-mono"
          style={{ color: priceData ? config.color : '#4B5563', opacity: 0.8 }}>
          {config.label}
        </span>
      </div>

      {priceData ? (
        <>
          <span className="font-display font-bold text-2xl leading-none" style={{ color: config.color }}>
            ${formatPriceValue(priceData.price)}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={9} className="text-gray-600" />
            <span className="text-[9px] text-gray-600 font-mono">
              {formatRelativeTime(priceData.created_at)} · {priceData.reported_by}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-0.5">
          {zoneAvg && (
            <span className="font-display font-bold text-xl text-gray-500 leading-none">
              ${formatPriceValue(zoneAvg)}
              <span className="text-xs font-body text-gray-600 ml-1">est.</span>
            </span>
          )}
          <span className="text-[9px] text-gray-600 italic">
            {isEstimate ? 'No venden / sin dato' : 'Promedio de zona'}
          </span>
        </div>
      )}
    </div>
  )
}

function ReportItem({ report, onVote }) {
  const Icon = REPORT_ICONS[report.type] || MessageSquare
  const typeConfig = REPORT_TYPE_LABELS[report.type] || REPORT_TYPE_LABELS.comment
  const [voted, setVoted] = useState(null)

  const handleVote = async (type) => {
    if (voted) return
    setVoted(type)
    await onVote({ reportId: report.id, voteType: type })
  }

  return (
    <div className="flex gap-3 py-3 border-b border-white/5 last:border-0 animate-fade-up">
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-surface-muted flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-fuel-500 font-mono">
        {report.user_display_name?.slice(0, 2).toUpperCase() || '??'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-bold text-white/70">{report.user_display_name}</span>
          <span className={cn(
            'text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 font-mono',
            report.type === 'warning' ? 'bg-amber-400/10 text-amber-400' :
            report.type === 'promotion' ? 'bg-fuel-500/10 text-fuel-500' :
            'bg-white/5 text-gray-500'
          )}>
            <Icon size={8} />
            {typeConfig.label}
          </span>
          <span className="text-[9px] text-gray-600 font-mono ml-auto">{formatRelativeTime(report.created_at)}</span>
        </div>

        <p className="text-[12px] text-gray-300 leading-relaxed">{report.content}</p>

        {/* Votes */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => handleVote('up')}
            className={cn(
              'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border transition-all',
              voted === 'up'
                ? 'border-fuel-500/50 text-fuel-500 bg-fuel-500/10'
                : 'border-white/10 text-gray-500 hover:border-fuel-500/40 hover:text-fuel-500'
            )}
          >
            <ThumbsUp size={9} />
            {report.votes_up + (voted === 'up' ? 1 : 0)}
          </button>
          <button
            onClick={() => handleVote('down')}
            className={cn(
              'flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full border transition-all',
              voted === 'down'
                ? 'border-red-400/50 text-red-400 bg-red-400/10'
                : 'border-white/10 text-gray-500 hover:border-red-400/40 hover:text-red-400'
            )}
          >
            <ThumbsDown size={9} />
            Incorrecto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StationPanel({ station, zoneData, onRefetch }) {
  const { setPanelOpen, setReportModalOpen, defaultFuelType, favoriteStationId, setFavoriteStationId } = useAppStore()
  const latestPrices = getLatestPrices(station?.fuel_prices)
  const hasData = hasReportedPrices(station)

  const [activeTab, setActiveTab] = useState('precios') // 'precios' | 'historial'

  if (!station) return null

  const brandColor = BRAND_COLORS[station.brand] || '#6B7280'
  const isFavorite = favoriteStationId === station.id

  const toggleFavorite = () => {
    if (isFavorite) {
      setFavoriteStationId(null)
    } else {
      setFavoriteStationId(station.id)
    }
  }

  return (
    <div className="flex flex-col h-full animate-slide-in-right bg-surface-card">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="p-4 pb-3 border-b border-white/5 relative overflow-hidden">
        {/* Brand color strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: brandColor }} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start">
            {/* Fuel pump icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
              style={{ background: brandColor + '20', border: `1px solid ${brandColor}40` }}>
              <Fuel size={18} style={{ color: brandColor }} />
              
              {/* Top-left area: GAS badge and Favorite star */}
              <div className="absolute -top-2 -left-2 flex items-center gap-1">
                {isFavorite && (
                  <div className="bg-amber-400 rounded-full p-1 border-2 border-[#111318] shadow-sm animate-fade-in">
                    <Star size={12} className="text-black fill-current" />
                  </div>
                )}
                
                {station.has_gnv && (
                  <div className="bg-orange-500 text-white text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#111318] shadow-sm">
                    GAS
                  </div>
                )}
              </div>
            </div>
            <div>
              <h2 className="font-display font-bold text-[17px] leading-tight">{station.name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-white/10 text-gray-400">
                  {station.brand}
                </span>
                {station.address && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-600">
                    <MapPin size={9} />
                    <span className="truncate max-w-[160px]">{station.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 -mt-0.5 -mr-0.5">
            <button
              onClick={toggleFavorite}
              className={cn(
                "p-1.5 rounded-lg transition-colors border",
                isFavorite 
                  ? "text-amber-400 bg-amber-400/10 border-amber-400/30" 
                  : "text-gray-500 hover:text-white hover:bg-white/5 border-transparent"
              )}
            >
              <Star size={16} className={isFavorite ? "fill-current" : ""} />
            </button>
            <button onClick={() => setPanelOpen(false)}
              className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 border border-transparent">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* No-data warning */}
        {!hasData && (
          <div className="mt-3 flex gap-2.5 p-2.5 rounded-lg border border-dashed border-amber-400/30 bg-amber-400/5">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/70 leading-relaxed">
              <strong className="text-amber-400">Sin precios verificados.</strong> Los valores mostrados son estimados del promedio de la zona. ¡Reporta el precio actual!
            </p>
          </div>
        )}
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex px-4 pt-1 pb-0 border-b border-white/5 flex-shrink-0">
        <button
          onClick={() => setActiveTab('precios')}
          className={cn(
            "flex-1 flex justify-center items-center gap-2 pb-3 pt-3 border-b-[3px] text-[11px] uppercase tracking-wider font-mono transition-all",
            activeTab === 'precios' ? "border-fuel-500 text-fuel-500" : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          <List size={14} />
          Precios y reportes
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={cn(
            "flex-1 flex justify-center items-center gap-2 pb-3 pt-3 border-b-[3px] text-[11px] uppercase tracking-wider font-mono transition-all",
            activeTab === 'historial' ? "border-fuel-500 text-fuel-500" : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          <BarChart2 size={14} />
          Historial
        </button>
      </div>

      {/* ── Tab Content Area ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'precios' ? (
          <>
            {/* ── Fuel prices grid ───────────────────────────── */}
            <div className="p-4 grid grid-cols-2 auto-rows-fr gap-2">
              {FUEL_ORDER.map((ft) => {
                // Ocultar urea si no hay precio reportado para este combustible
                if (ft === 'urea' && !latestPrices[ft]) return null

                let zoneAvg = null
                if (ft === 'diesel')    zoneAvg = zoneData?.avg_diesel
                else if (ft === 'extra')     zoneAvg = zoneData?.avg_extra
                else if (ft === 'corriente') zoneAvg = zoneData?.avg_corriente
                else if (ft === 'gnv')       zoneAvg = zoneData?.avg_gnv

                return (
                  <FuelCard
                    key={ft}
                    fuelType={ft}
                    priceData={latestPrices[ft]}
                    zoneAvg={hasData ? null : zoneAvg}
                    hasData={hasData}
                  />
                )
              })}
            </div>

            {/* ── Services section ───────────────────────────── */}
            <div className="p-4 pt-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">
                  Servicios
                </h3>
              </div>

              {(() => {
                const srvcs = SERVICES.filter(s => station?.[s.key] === true)
                const hasAnyData = srvcs.length > 0

                if (hasAnyData) {
                  return (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {srvcs.map(confDef => {
                        const Icon = confDef.icon
                        return (
                          <div key={confDef.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fuel-500/10 border border-fuel-500/20 text-fuel-500 transition-all hover:bg-fuel-500/20">
                            <Icon size={12} />
                            <span className="text-[10px] font-mono font-medium">{confDef.label}</span>
                          </div>
                        )
                      })}
                      <button
                        onClick={() => setReportModalOpen(true, true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted/30 border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 snap-start whitespace-nowrap transition-colors"
                      >
                        <Plus size={12} />
                        <span className="text-[10px] font-mono font-medium">Agregar</span>
                      </button>
                    </div>
                  )
                }

                // No data
                return (
                  <div className="flex flex-col items-center py-4 text-center rounded-xl border border-white/5 bg-surface-muted/10">
                    <p className="text-[11px] text-gray-500 mb-2">Sin información de servicios</p>
                    <button onClick={() => setReportModalOpen(true, true)}
                      className="text-[10px] font-mono text-fuel-500 border border-fuel-500/30 px-3 py-1.5 rounded-lg hover:bg-fuel-500/10 transition-colors">
                      Sé el primero en reportar
                    </button>
                  </div>
                )
              })()}
            </div>

            {/* ── Reports section ────────────────────────────── */}
            <div className="p-4 pt-0">
              <div className="flex items-center justify-between mt-2 mb-3">
                <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">
                  Reportes comunitarios ({station.reports?.length || 0})
                </h3>
              </div>

              {station.reports?.length > 0 ? (
                <div className="space-y-2.5">
                  {station.reports.map((report) => (
                    <ReportItem
                      key={report.id}
                      report={report}
                      onVote={async ({ reportId, voteType }) => {
                        await voteOnReport({ reportId, voteType })
                        onRefetch?.()
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 gap-2 text-center">
                  <MessageSquare size={28} className="text-gray-700 mb-1" />
                  <p className="text-[12px] text-gray-500">Nadie ha reportado aún.</p>
                  <p className="text-[11px] text-gray-700">¡Sé el primero en reportar el precio!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ── Price History ───────────────────────────────── */
          <div className="p-4 pt-6">
            <PriceHistoryChart
              stationId={station.id}
              initialFuelType={defaultFuelType}
            />
          </div>
        )}
      </div>

      {/* ── CTA Button ─────────────────────────────────── */}
      <div className="p-4 pt-2 border-t border-white/5">
        <button
          onClick={() => setReportModalOpen(true)}
          className="w-full bg-fuel-500 hover:bg-fuel-600 text-surface font-display font-bold text-[15px] py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus size={16} strokeWidth={2.5} />
          Reportar precio
        </button>
      </div>
    </div>
  )
}
