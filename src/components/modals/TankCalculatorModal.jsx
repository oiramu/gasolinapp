import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Calculator, ChevronDown, Share2, TrendingUp, TrendingDown,
  Fuel, Zap, Droplets, Wind, RefreshCw, SlidersHorizontal,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import {
  FUEL_TYPES, FUEL_ORDER, getLatestPrices,
  formatPrice, getFuelUnitLabel, getFuelUnit, formatPriceValue
} from '@/lib/fuel'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_CAPACITY   = 'gasolinapp_tank_capacity'
const LS_FUEL_TYPE  = 'gasolinapp_calc_fuel_type'
const LS_EFFICIENCY = 'gasolinapp_fuel_efficiency'

function lsGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, String(val)) } catch {}
}

// ── Capacity chips por tipo de combustible ────────────────────────────────────
const CAPACITY_CHIPS = {
  gnv: [8, 12, 16, 20],
  _default: [8, 10, 12, 14, 16],
}

function getChips(fuelType) {
  return CAPACITY_CHIPS[fuelType] ?? CAPACITY_CHIPS._default
}

// ── Íconos de combustible ─────────────────────────────────────────────────────
const FUEL_ICONS = { corriente: Zap, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }

const FUEL_CHIPS_LIST = FUEL_ORDER.filter(f => f !== 'urea')

// ── Formateador de pesos COP ──────────────────────────────────────────────────
function fmtCOP(n) {
  if (!n && n !== 0) return '—'
  return `$${formatPriceValue(n, 0)}`
}

// ── Hook: precio histórico (≈30 días atrás) ───────────────────────────────────
function useHistoricalPrice(stationId, fuelType, enabled) {
  const [historicalPrice, setHistoricalPrice] = useState(null)

  useEffect(() => {
    if (!enabled || !fuelType) return
    let cancelled = false

    async function fetch30d() {
      const t35  = new Date(Date.now() - 35 * 86400000).toISOString()
      const t25  = new Date(Date.now() - 25 * 86400000).toISOString()

      let price = null

      if (stationId) {
        // Intentar con estación específica
        const { data } = await supabase
          .from('fuel_prices')
          .select('price')
          .eq('station_id', stationId)
          .eq('fuel_type', fuelType)
          .gte('created_at', t35)
          .lte('created_at', t25)
          .order('created_at', { ascending: false })
          .limit(1)

        if (data?.[0]) price = data[0].price
      }

      if (price == null) {
        // Fallback: promedio de latest_prices (aproximación de ciudad)
        const { data } = await supabase
          .from('latest_prices')
          .select('price')
          .eq('fuel_type', fuelType)
          .limit(50)

        if (data?.length) {
          const avg = data.reduce((s, r) => s + Number(r.price), 0) / data.length
          price = Math.round(avg)
        }
      }

      if (!cancelled) setHistoricalPrice(price)
    }

    fetch30d()
    return () => { cancelled = true }
  }, [stationId, fuelType, enabled])

  return historicalPrice
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function TankCalculatorModal() {
  const {
    calculatorOpen,
    calculatorStation,
    setCalculatorOpen,
    defaultFuelType,
  } = useAppStore()

  // ─ Fuel type (local, no sobreescribe global) ─
  const [fuelType, setFuelType] = useState(() => lsGet(LS_FUEL_TYPE) ?? defaultFuelType ?? 'corriente')

  // ─ Capacity ─
  const chips = getChips(fuelType)
  const [capacity, setCapacity]     = useState(() => {
    const saved = lsGet(LS_CAPACITY)
    return saved ? Number(saved) : 12
  })
  const [activeChip, setActiveChip] = useState(() => {
    const saved = Number(lsGet(LS_CAPACITY) ?? 12)
    const chipList = getChips(lsGet(LS_FUEL_TYPE) ?? defaultFuelType ?? 'corriente')
    return chipList.includes(saved) ? saved : null
  })

  // ─ Current level ─
  const [showLevel, setShowLevel]   = useState(false)
  const [currentLevel, setCurrentLevel] = useState(25) // porcentaje

  // ─ Price source ─
  const hasStation = !!calculatorStation
  const [useStation, setUseStation] = useState(true)

  // ─ Current price ─
  const currentPrice = (() => {
    if (hasStation && useStation) {
      const prices = getLatestPrices(calculatorStation?.fuel_prices ?? [])
      return prices[fuelType]?.price ?? null
    }
    // Ciudad: promedio de zone averages (si está disponible) o null
    return null
  })()

  // ─ Efficiency ─
  const [showEfficiency, setShowEfficiency] = useState(false)
  const [efficiency, setEfficiency]         = useState(() => {
    const saved = lsGet(LS_EFFICIENCY)
    return saved ? Number(saved) : ''
  })

  // ─ Animation ─
  const [visible, setVisible] = useState(false)

  // ─ Historical price ─
  const historicalPrice = useHistoricalPrice(
    hasStation && useStation ? calculatorStation?.id : null,
    fuelType,
    calculatorOpen,
  )

  // Sync when opened
  useEffect(() => {
    if (calculatorOpen) {
      // Restore from localStorage
      const savedFuel = lsGet(LS_FUEL_TYPE)
      if (savedFuel && FUEL_TYPES[savedFuel]) setFuelType(savedFuel)

      const savedCap = lsGet(LS_CAPACITY)
      if (savedCap) {
        const numCap  = Number(savedCap)
        setCapacity(numCap)
        const chipList = getChips(savedFuel ?? defaultFuelType)
        setActiveChip(chipList.includes(numCap) ? numCap : null)
      }

      const savedEff = lsGet(LS_EFFICIENCY)
      if (savedEff) setEfficiency(Number(savedEff))

      // Reset state
      setUseStation(true)
      setTimeout(() => setVisible(true), 10)
    } else {
      setVisible(false)
    }
  }, [calculatorOpen, defaultFuelType])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close() }
    if (calculatorOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [calculatorOpen])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(() => setCalculatorOpen(false, null), 180)
  }, [setCalculatorOpen])

  // Persists changes
  const handleFuelChange = (ft) => {
    setFuelType(ft)
    lsSet(LS_FUEL_TYPE, ft)
    // Recalculate chips for new fuel
    const newChips = getChips(ft)
    const cap = capacity
    setActiveChip(newChips.includes(cap) ? cap : null)
  }

  const handleChipSelect = (val) => {
    setActiveChip(val)
    setCapacity(val)
    lsSet(LS_CAPACITY, val)
  }

  const handleCapacityInput = (raw) => {
    const val = parseFloat(raw)
    setCapacity(raw === '' ? '' : val)
    if (raw !== '' && !isNaN(val)) {
      setActiveChip(chips.includes(val) ? val : null)
      lsSet(LS_CAPACITY, val)
    }
  }

  const handleEfficiencyChange = (val) => {
    setEfficiency(val)
    if (val) lsSet(LS_EFFICIENCY, val)
  }

  // ── Calculations ─────────────────────────────────────────────────────────
  const numCapacity = Number(capacity) || 0
  const numPrice    = Number(currentPrice) || 0
  const costFull    = numCapacity * numPrice

  const fromLevelCost = showLevel && numPrice
    ? ((100 - currentLevel) / 100) * numCapacity * numPrice
    : null

  const costHistorical   = historicalPrice != null ? numCapacity * historicalPrice : null
  const deltaCOP         = costHistorical != null ? costFull - costHistorical : null
  const deltaPct         = costHistorical != null && costHistorical > 0
    ? ((costFull - costHistorical) / costHistorical * 100).toFixed(1)
    : null

  const numEfficiency   = Number(efficiency) || 0
  const costPerKm       = numEfficiency > 0 && numPrice > 0 ? numPrice / numEfficiency : null
  const range           = numEfficiency > 0 ? numCapacity * numEfficiency : null

  // ── Share text ───────────────────────────────────────────────────────────
  const handleShare = () => {
    const ft    = FUEL_TYPES[fuelType]?.label ?? fuelType
    const unit  = getFuelUnitLabel(fuelType)
    const place = hasStation && useStation ? calculatorStation.name : 'tu ciudad'
    const url   = window.location.href

    let text = `⛽ Precio gasolina ${ft} en ${place} hoy:\n${fmtCOP(numPrice)}/${unit}\n\n`
    text += `🚗 Tanque lleno (~${numCapacity} ${unit}): ${fmtCOP(costFull)}\n`
    if (costHistorical != null) {
      text += `📈 Hace un mes costaba ${fmtCOP(costHistorical)}\n`
    }
    text += `\nConsulta precios en tiempo real 👉 ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (!calculatorOpen) return null

  const fuelColor = FUEL_TYPES[fuelType]?.color || '#00E5A0'
  const unitLabel = getFuelUnitLabel(fuelType)

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[950] flex items-end sm:items-center justify-center transition-all duration-200',
        visible ? 'opacity-100' : 'opacity-0'
      )}
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className={cn(
          'relative w-full sm:max-w-md bg-surface-card border border-white/10 rounded-t-2xl sm:rounded-2xl',
          'overflow-hidden max-h-[92vh] flex flex-col shadow-2xl transition-all duration-200',
          visible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        )}
        style={{ borderColor: fuelColor + '20' }}
      >
        {/* Color strip */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(to right, ${fuelColor}, ${fuelColor}60)` }} />

        {/* ── Header ─── */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: fuelColor + '18' }}>
              <Calculator size={15} style={{ color: fuelColor }} />
            </div>
            <div>
              <h2 className="font-display font-bold text-[16px] leading-tight">Calculadora de tanque</h2>
              {hasStation && (
                <p className="text-[10px] text-gray-500 font-mono mt-0.5 truncate max-w-[220px]">
                  {calculatorStation.name} · {calculatorStation.brand}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={close}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ─── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* ── Sección 1: Tipo de combustible ── */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-2">
              Combustible
            </label>
            <div className="flex flex-wrap gap-1.5">
              {FUEL_CHIPS_LIST.map(ft => {
                const cfg    = FUEL_TYPES[ft]
                const Icon   = FUEL_ICONS[ft] || Fuel
                const active = ft === fuelType
                return (
                  <button
                    key={ft}
                    onClick={() => handleFuelChange(ft)}
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] font-mono px-3 py-1.5 rounded-full border transition-all',
                      !active && 'border-white/10 text-gray-500 hover:border-white/20'
                    )}
                    style={active ? {
                      background:  cfg.color + '18',
                      color:       cfg.color,
                      borderColor: cfg.color + '50',
                    } : {}}
                  >
                    <Icon size={10} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Sección 1b: Capacidad del tanque ── */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-2">
              Capacidad del tanque ({unitLabel})
            </label>
            {/* Chips rápidos */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {chips.map(val => (
                <button
                  key={val}
                  onClick={() => handleChipSelect(val)}
                  className={cn(
                    'text-[12px] font-mono px-3 py-1.5 rounded-full border transition-all min-w-[44px]',
                    activeChip === val
                      ? 'text-white border-white/30 bg-white/10'
                      : 'border-white/10 text-gray-600 hover:border-white/20'
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
            {/* Input manual */}
            <div className="relative">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={capacity}
                onChange={(e) => handleCapacityInput(e.target.value)}
                className="w-full bg-surface-muted/30 border border-white/10 rounded-xl px-3 py-2.5 text-[14px] font-mono text-white outline-none focus:border-white/25 transition-colors pr-16"
                placeholder="Ej: 11.5"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600">
                {unitLabel}
              </span>
            </div>
          </div>

          {/* ── Nivel actual (opcional) ── */}
          <div>
            <button
              onClick={() => setShowLevel(v => !v)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500 font-mono hover:text-gray-400 transition-colors mb-2"
            >
              <SlidersHorizontal size={10} />
              Nivel actual del tanque
              <ChevronDown size={10} className={cn('transition-transform', showLevel && 'rotate-180')} />
            </button>
            {showLevel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-gray-400">
                  <span>0%</span>
                  <span className="text-white font-bold">{currentLevel}%</span>
                  <span>100%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentLevel}
                  onChange={(e) => setCurrentLevel(Number(e.target.value))}
                  className="w-full accent-current"
                  style={{ accentColor: fuelColor }}
                />
              </div>
            )}
          </div>

          {/* ── Fuente del precio ── */}
          {hasStation && (
            <div>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 font-mono block mb-2">
                Fuente del precio
              </label>
              <div className="flex gap-2">
                {[
                  { val: true,  label: 'Estación actual' },
                  { val: false, label: 'Mi ciudad'        },
                ].map(opt => (
                  <button
                    key={String(opt.val)}
                    onClick={() => setUseStation(opt.val)}
                    className={cn(
                      'flex-1 text-[11px] font-mono py-2 rounded-xl border transition-all',
                      useStation === opt.val
                        ? 'border-white/25 bg-white/8 text-white'
                        : 'border-white/8 text-gray-600 hover:border-white/15'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Sin precio disponible ── */}
          {!currentPrice && (
            <div className="py-3 px-3.5 rounded-xl border border-amber-400/20 bg-amber-400/5 text-[11px] text-amber-300/70 font-mono">
              Sin precio disponible para {FUEL_TYPES[fuelType]?.label} en esta fuente.
              Cambia la fuente o reporta un precio.
            </div>
          )}

          {/* ── Sección 3: Resultados ── */}
          {currentPrice > 0 && (
            <div className="space-y-3">
              {/* Costo tanque lleno */}
              <div
                className="rounded-2xl p-4 border"
                style={{ background: fuelColor + '0c', borderColor: fuelColor + '25' }}
              >
                <p className="text-[10px] uppercase tracking-wider font-mono mb-1.5"
                   style={{ color: fuelColor + 'aa' }}>
                  Costo — tanque lleno
                </p>
                <p className="font-display font-bold text-[36px] leading-none" style={{ color: fuelColor }}>
                  {fmtCOP(costFull)}
                </p>
                <p className="text-[10px] text-gray-600 font-mono mt-1.5">
                  {numCapacity} {unitLabel} × {formatPrice(numPrice, fuelType)}
                </p>
              </div>

              {/* Desde nivel actual */}
              {showLevel && fromLevelCost != null && currentLevel < 100 && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-muted/30 border border-white/8">
                  <span className="text-[11px] font-mono text-gray-400">
                    Para llenar desde {currentLevel}%
                  </span>
                  <span className="text-[15px] font-display font-bold text-white">
                    {fmtCOP(fromLevelCost)}
                  </span>
                </div>
              )}

              {/* Comparativa 30 días */}
              {deltaCOP != null && (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-muted/30 border border-white/8">
                  <div>
                    <p className="text-[10px] font-mono text-gray-500">vs. hace 30 días</p>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                      Antes: {fmtCOP(costHistorical)}
                    </p>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1.5 text-[13px] font-display font-bold',
                    deltaCOP > 0 ? 'text-red-400' : 'text-green-400'
                  )}>
                    {deltaCOP > 0
                      ? <TrendingUp size={13} />
                      : <TrendingDown size={13} />
                    }
                    <span>
                      {deltaCOP > 0 ? '↑' : '↓'} {fmtCOP(Math.abs(deltaCOP))}
                      <span className="text-[10px] font-mono ml-1 opacity-70">
                        ({deltaPct > 0 ? '+' : ''}{deltaPct}%)
                      </span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Rendimiento (opcional) ── */}
          <div>
            <button
              onClick={() => setShowEfficiency(v => !v)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500 font-mono hover:text-gray-400 transition-colors mb-2"
            >
              <SlidersHorizontal size={10} />
              Rendimiento del vehículo (opcional)
              <ChevronDown size={10} className={cn('transition-transform', showEfficiency && 'rotate-180')} />
            </button>
            {showEfficiency && (
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={efficiency}
                    onChange={(e) => handleEfficiencyChange(e.target.value)}
                    placeholder="Ej: 35"
                    className="w-full bg-surface-muted/30 border border-white/10 rounded-xl px-3 py-2.5 text-[13px] font-mono text-white outline-none focus:border-white/25 transition-colors pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600">
                    km/{unitLabel}
                  </span>
                </div>

                {costPerKm != null && (
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-surface-muted/20 border border-white/5 gap-0.5">
                      <span className="text-[13px] font-display font-bold text-white">
                        {fmtCOP(costPerKm)}/km
                      </span>
                      <span className="text-[9px] text-gray-600 font-mono">Costo por km</span>
                    </div>
                    {range != null && (
                      <div className="flex-1 flex flex-col items-center py-2.5 rounded-xl bg-surface-muted/20 border border-white/5 gap-0.5">
                        <span className="text-[13px] font-display font-bold text-white">
                          ~{Math.round(range)} km
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono">Autonomía</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer: Compartir ── */}
        <div className="px-4 py-3.5 border-t border-white/5">
          <button
            onClick={handleShare}
            disabled={!currentPrice}
            className={cn(
              'w-full py-3 rounded-xl font-display font-bold text-[14px] flex items-center justify-center gap-2 transition-all',
              currentPrice
                ? 'bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 active:scale-[0.98]'
                : 'bg-surface-muted text-gray-600 border border-white/5 cursor-not-allowed'
            )}
          >
            <Share2 size={14} />
            Compartir en WhatsApp
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
