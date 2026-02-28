import { useEffect, useState } from 'react'
import {
  Fuel, MapPin, ThumbsUp, ThumbsDown, Plus, X,
  AlertTriangle, Clock, Tag, MessageSquare, ChevronRight,
  Droplets, Zap, Star, RefreshCw, Info,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER, getLatestPrices, hasReportedPrices, formatRelativeTime, REPORT_TYPE_LABELS, BRAND_COLORS } from '@/lib/fuel'
import { voteOnReport } from '@/services/reports.service'
import { cn } from '@/lib/utils'

const FUEL_ICONS = { extra: Fuel, super: Zap, diesel: Droplets, urea: RefreshCw }
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
            ${priceData.price.toFixed(2)}
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
              ${zoneAvg.toFixed(2)}
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
  const { setPanelOpen, setReportModalOpen } = useAppStore()
  const latestPrices = getLatestPrices(station?.fuel_prices)
  const hasData = hasReportedPrices(station)

  if (!station) return null

  const brandColor = BRAND_COLORS[station.brand] || '#6B7280'

  return (
    <div className="flex flex-col h-full animate-slide-in-right bg-surface-card">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="p-4 pb-3 border-b border-white/5 relative overflow-hidden">
        {/* Brand color strip */}
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: brandColor }} />

        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-start">
            {/* Fuel pump icon */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: brandColor + '20', border: `1px solid ${brandColor}40` }}>
              <Fuel size={18} style={{ color: brandColor }} />
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
          <button onClick={() => setPanelOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-1 -mt-0.5 -mr-0.5">
            <X size={16} />
          </button>
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

      {/* ── Fuel prices grid ───────────────────────────── */}
      <div className="p-4 pb-0 grid grid-cols-2 gap-2">
        {FUEL_ORDER.map((ft) => {
          const zoneAvg = ft === 'diesel' ? zoneData?.avg_diesel : zoneData?.avg_extra
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

      {/* ── Reports section ────────────────────────────── */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">
            Reportes ({station.reports?.length || 0})
          </h3>
        </div>

        {station.reports?.length > 0 ? (
          station.reports.map((report) => (
            <ReportItem
              key={report.id}
              report={report}
              onVote={async ({ reportId, voteType }) => {
                await voteOnReport({ reportId, voteType })
                onRefetch?.()
              }}
            />
          ))
        ) : (
          <div className="flex flex-col items-center py-6 gap-2 text-center">
            <MessageSquare size={28} className="text-gray-700" />
            <p className="text-[12px] text-gray-600">Nadie ha reportado aún.</p>
            <p className="text-[11px] text-gray-700">¡Sé el primero en reportar el precio!</p>
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
