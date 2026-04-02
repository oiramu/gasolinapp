import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Dot
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, MessageSquare, BarChart2, Plus, Fuel, Clock } from 'lucide-react'
import FilterSelect from '@/components/FilterSelect'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER, formatPrice, getFuelUnitLabel } from '@/lib/fuel'
import { format, subDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// ── Período helpers ────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '7d',  days: 7  },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
]

const FUEL_CHIPS = FUEL_ORDER.filter(f => f !== 'urea')

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtAxisPrice(val) {
  if (!val && val !== 0) return ''
  return `$${Number(val).toLocaleString('es-CO')}`
}

function fmtAxisDate(val) {
  if (!val) return ''
  try {
    const d = typeof val === 'string' ? parseISO(val) : new Date(val)
    return format(d, 'dd/MM')
  } catch {
    return val
  }
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, fuelType }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  let fullDate = label
  try {
    const dt = typeof label === 'string' ? parseISO(label) : new Date(label)
    fullDate = format(dt, "EEEE d 'de' MMMM", { locale: es })
    fullDate = fullDate.charAt(0).toUpperCase() + fullDate.slice(1)
  } catch {}

  const unitLabel = getFuelUnitLabel(fuelType)

  return (
    <div className="bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl text-left min-w-[160px]">
      <p className="text-[10px] text-gray-500 font-mono mb-1.5">{fullDate}</p>
      <p className="text-[15px] font-display font-bold text-white">{fmtAxisPrice(d.avg_price)}/{unitLabel}</p>
      {d.report_count > 0 && (
        <p className="text-[10px] text-gray-500 font-mono mt-1">
          {d.report_count} {d.report_count === 1 ? 'reporte' : 'reportes'}
        </p>
      )}
      {d.min_price !== d.max_price && d.min_price != null && d.max_price != null && (
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">
          Rango: {fmtAxisPrice(d.min_price)} – {fmtAxisPrice(d.max_price)}
        </p>
      )}
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────
function ChartSkeleton() {
  return (
    <div className="w-full h-[180px] rounded-xl bg-surface-muted/30 animate-pulse flex items-end px-4 pb-4 gap-1.5 overflow-hidden">
      {[40, 60, 45, 70, 55, 80, 65, 75, 50, 85, 60, 70].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm bg-white/5"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

// ── Hook de datos ─────────────────────────────────────────────────────────────
function usePriceHistory(stationId, fuelType, days) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!stationId || !fuelType) return
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchHistory() {
      const startDate = subDays(new Date(), days).toISOString()

      // Intentar con daily_avg_prices primero
      const { data: matData, error: matErr } = await supabase
        .from('daily_avg_prices')
        .select('price_date, avg_price, min_price, max_price, report_count')
        .eq('station_id', stationId)
        .eq('fuel_type', fuelType)
        .gte('price_date', startDate)
        .order('price_date', { ascending: true })

      if (matErr) {
        // Fallback: agrupar fuel_prices en cliente
        const { data: raw, error: rawErr } = await supabase
          .from('fuel_prices')
          .select('price, created_at')
          .eq('station_id', stationId)
          .eq('fuel_type', fuelType)
          .eq('is_active', true)
          .gte('created_at', startDate)
          .order('created_at', { ascending: true })

        if (!cancelled) {
          if (rawErr) {
            setError(rawErr.message)
            setData([])
          } else {
            // Agrupar por día en cliente
            const byDay = {}
            for (const row of raw ?? []) {
              const day = row.created_at.slice(0, 10)
              if (!byDay[day]) byDay[day] = []
              byDay[day].push(row.price)
            }
            const grouped = Object.entries(byDay).map(([date, prices]) => ({
              price_date:   date,
              avg_price:    Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
              min_price:    Math.min(...prices),
              max_price:    Math.max(...prices),
              report_count: prices.length,
            }))
            setData(grouped)
          }
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setData(matData ?? [])
        setLoading(false)
      }
    }

    fetchHistory()
    return () => { cancelled = true }
  }, [stationId, fuelType, days])

  return { data, loading, error }
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function PriceHistoryChart({ stationId, initialFuelType }) {
  const { defaultFuelType, setReportModalOpen } = useAppStore()
  const [period, setPeriod]   = useState(30)
  const [fuelType, setFuelType] = useState(initialFuelType ?? defaultFuelType ?? 'corriente')

  // Sync si el prop cambia
  useEffect(() => {
    if (initialFuelType) setFuelType(initialFuelType)
  }, [initialFuelType])

  const { data, loading } = usePriceHistory(stationId, fuelType, period)

  const fuelConfig = FUEL_TYPES[fuelType]
  const color      = fuelConfig?.color || '#00E5A0'

  // Estadísticas del período
  const stats = (() => {
    if (!data.length) return null
    const prices = data.map(d => Number(d.avg_price)).filter(Boolean)
    if (!prices.length) return null
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    }
  })()

  const fewData = !loading && data.length > 0 && data.length <= 2

  // Calcular dominio del eje Y con padding
  const yDomain = (() => {
    if (!data.length) return ['auto', 'auto']
    const prices = data.map(d => Number(d.avg_price)).filter(Boolean)
    if (!prices.length) return ['auto', 'auto']
    const mn = Math.min(...prices)
    const mx = Math.max(...prices)
    const pad = Math.max((mx - mn) * 0.15, 500) // al menos 500 COP de padding
    return [Math.floor((mn - pad) / 100) * 100, Math.ceil((mx + pad) / 100) * 100]
  })()

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 size={13} className="text-gray-500" />
          <h3 className="text-[11px] uppercase tracking-wider text-gray-500 font-mono">
            Historial de precios
          </h3>
        </div>
      </div>

      {/* ── Selects: combustible + período ── */}
      <div className="flex gap-2 mb-5 relative z-10">
        <FilterSelect
          icon={Fuel}
          value={fuelType}
          activeColor={FUEL_TYPES[fuelType]?.color}
          options={FUEL_CHIPS.map(ft => ({
            value: ft,
            label: FUEL_TYPES[ft].label,
            color: FUEL_TYPES[ft].color
          }))}
          onChange={setFuelType}
        />

        <FilterSelect
          icon={Clock}
          value={period}
          options={PERIODS.map(p => ({
            value: p.days,
            label: p.label
          }))}
          onChange={(val) => setPeriod(Number(val))}
        />
      </div>

      {/* ── Chart area ── */}
      {loading ? (
        <ChartSkeleton />
      ) : data.length === 0 ? (
        /* Estado vacío */
        <div className="flex flex-col items-center py-8 gap-3 text-center bg-surface-muted/20 rounded-xl border border-dashed border-white/8">
          <MessageSquare size={24} className="text-gray-700" />
          <div>
            <p className="text-[12px] text-gray-500 font-mono">
              Sin reportes en los últimos {period} días
            </p>
            <p className="text-[10px] text-gray-700 mt-0.5">
              ¡Sé el primero en reportar el precio aquí!
            </p>
          </div>
          <button
            onClick={() => setReportModalOpen(true)}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-fuel-500/40 text-fuel-500 hover:bg-fuel-500/10 transition-all flex items-center gap-1"
          >
            <Plus size={10} />
            Reportar precio
          </button>
        </div>
      ) : (
        <>
          {fewData && (
            <p className="text-[10px] text-gray-600 font-mono mb-2 italic">
              Pocos datos — el historial mejora con más reportes de la comunidad.
            </p>
          )}

          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={`grad-${fuelType}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.20} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

              <XAxis
                dataKey="price_date"
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtAxisDate}
                interval="preserveStartEnd"
              />

              <YAxis
                tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtAxisPrice}
                width={65}
                domain={yDomain}
                tickCount={5}
              />

              <Tooltip
                content={<CustomTooltip fuelType={fuelType} />}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />

              {/* Línea de referencia: promedio del período */}
              {stats && (
                <ReferenceLine
                  y={stats.avg}
                  stroke={color}
                  strokeDasharray="4 4"
                  strokeOpacity={0.4}
                  label={{
                    value: `${fmtAxisPrice(stats.avg)} prom.`,
                    position: 'insideTopRight',
                    style: { fontSize: 8, fontFamily: 'monospace', fill: color, opacity: 0.6 },
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="avg_price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#grad-${fuelType})`}
                dot={fewData
                  ? { r: 5, fill: color, stroke: color, strokeWidth: 2 }
                  : false
                }
                activeDot={{ r: 5, fill: color, stroke: '#0A0F1E', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      {/* ── Estadísticas del período ── */}
      {!loading && stats && (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl bg-surface-muted/20 border border-white/5">
            <div className="flex items-center gap-1 text-green-400">
              <TrendingDown size={10} />
              <span className="text-[11px] font-display font-bold">{fmtAxisPrice(stats.min)}</span>
            </div>
            <span className="text-[9px] text-gray-600 font-mono">Mínimo</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl bg-surface-muted/20 border border-white/5">
            <div className="flex items-center gap-1 text-gray-300">
              <Minus size={10} />
              <span className="text-[11px] font-display font-bold">{fmtAxisPrice(stats.avg)}</span>
            </div>
            <span className="text-[9px] text-gray-600 font-mono">Promedio</span>
          </div>

          <div className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl bg-surface-muted/20 border border-white/5">
            <div className="flex items-center gap-1 text-red-400">
              <TrendingUp size={10} />
              <span className="text-[11px] font-display font-bold">{fmtAxisPrice(stats.max)}</span>
            </div>
            <span className="text-[9px] text-gray-600 font-mono">Máximo</span>
          </div>
        </div>
      )}
    </div>
  )
}
