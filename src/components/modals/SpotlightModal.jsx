import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, X, Navigation, Clock, MapPin, Building2, ArrowUpDown, ChevronDown, Fuel } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER, getLatestPrices, formatRelativeTime } from '@/lib/fuel'

const FUEL_OPTIONS = FUEL_ORDER.filter(f => f !== 'urea')
const BRANDS = ['Todas', 'Terpel', 'Biomax', 'Primax', 'Shell', 'Mobil', 'EDS', 'Petrobras', 'Gulf']
const SORT_OPTIONS = [
  { value: 'price', label: 'Precio', icon: '↑' },
  { value: 'distance', label: 'Distancia', icon: '📍' },
]

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function formatDist(m) {
  if (!m && m !== 0) return null
  return m < 1000 ? `${Math.round(m)}m` : `${(m/1000).toFixed(1)}km`
}

function FilterSelect({ value, options, onChange, icon: Icon, label, activeColor }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const clickOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) window.addEventListener('mousedown', clickOut)
    return () => window.removeEventListener('mousedown', clickOut)
  }, [open])

  const selectedOption = typeof options[0] === 'string' 
    ? value 
    : options.find(o => o.value === value)?.label

  const isDefault = value === 'Todas' || value === 'price'
  const isActive = open || !isDefault

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono transition-all border ${
          isActive
            ? 'bg-white/10 text-white border-white/20'
            : 'text-gray-500 border-white/5 hover:border-white/10'
        }`}
        style={isActive && activeColor ? { background: activeColor + '15', color: activeColor, borderColor: activeColor + '30' } : {}}
      >
        {Icon && <Icon size={12} className="opacity-70" />}
        <span className="truncate max-w-[80px]">{selectedOption}</span>
        <ChevronDown size={10} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[120px] animate-fadeSlideIn">
          {options.map(opt => {
            const val = typeof opt === 'string' ? opt : opt.value
            const lab = typeof opt === 'string' ? opt : opt.label
            const isSelected = val === value
            const optColor = typeof opt !== 'string' && opt.color ? opt.color : null

            return (
              <button
                key={val}
                onClick={() => { onChange(val); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors ${
                  isSelected ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
                style={isSelected && optColor ? { color: optColor } : {}}
              >
                {lab}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SpotlightModal({ stations, activeFuelType, userPos, onSelect }) {
  const { spotlightOpen, setSpotlightOpen } = useAppStore()

  const [query, setQuery]         = useState('')
  const [brand, setBrand]         = useState('Todas')
  const [fuel, setFuel]           = useState(activeFuelType)
  const [sortBy, setSortBy]       = useState('price')
  const [activeIdx, setActiveIdx] = useState(0)
  const [visible, setVisible]     = useState(false)

  const inputRef    = useRef(null)
  const listRef     = useRef(null)
  const itemRefs    = useRef([])

  // Sync fuel with outside selection
  useEffect(() => { setFuel(activeFuelType) }, [activeFuelType])

  // Animate open/close
  useEffect(() => {
    if (spotlightOpen) {
      setTimeout(() => setVisible(true), 10)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setVisible(false)
    }
  }, [spotlightOpen])

  const close = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      setSpotlightOpen(false)
      setQuery('')
      setActiveIdx(0)
    }, 150)
  }, [setSpotlightOpen])

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') close() }
    if (spotlightOpen) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [spotlightOpen, close])

  // Filter + sort stations
  const results = (() => {
    let list = stations
      .map(s => {
        const prices = getLatestPrices(s.fuel_prices ?? [])
        const price  = prices[fuel]
        const dist   = userPos ? haversine(userPos.lat, userPos.lng, s.lat, s.lng) : null
        return { ...s, _price: price, _dist: dist }
      })
      .filter(s => {
        if (brand !== 'Todas' && s.brand !== brand) return false
        const q = query.toLowerCase()
        if (q && !s.name.toLowerCase().includes(q) && !s.brand?.toLowerCase().includes(q) && !s.address?.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'price') {
          const ap = a._price?.price ?? Infinity
          const bp = b._price?.price ?? Infinity
          return ap - bp
        }
        if (sortBy === 'distance') {
          return (a._dist ?? Infinity) - (b._dist ?? Infinity)
        }
        return 0
      })

    return list.slice(0, 20)
  })()

  // Keyboard nav
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.min(activeIdx + 1, results.length - 1)
      setActiveIdx(next)
      itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = Math.max(activeIdx - 1, 0)
      setActiveIdx(prev)
      itemRefs.current[prev]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && results[activeIdx]) {
      handleSelect(results[activeIdx])
    }
  }

  const handleSelect = (s) => {
    close()
    setTimeout(() => onSelect(s), 160)
  }

  const fuelColor = FUEL_TYPES[fuel]?.color || '#00E5A0'

  if (!spotlightOpen) return null

  return createPortal(
    <div
      className={`fixed inset-0 z-[900] flex items-start justify-center pt-[10vh] sm:pt-[15vh] transition-all duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className={`relative w-full max-w-[640px] mx-4 bg-surface-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] transition-all duration-150 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        style={{ WebkitBackdropFilter: 'blur(40px)' }}
      >
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={18} className="text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar estación, empresa, barrio..."
            className="flex-1 bg-transparent text-[15px] text-white placeholder-gray-600 font-body outline-none"
          />
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-1 rounded-md">
            ESC
          </div>
          <button onClick={close} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── Filter selects ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 no-scrollbar overflow-visible">
          {/* Fuel Select */}
          <FilterSelect
            icon={Fuel}
            value={fuel}
            activeColor={FUEL_TYPES[fuel].color}
            options={FUEL_OPTIONS.map(ft => ({ 
              value: ft, 
              label: FUEL_TYPES[ft].label,
              color: FUEL_TYPES[ft].color
            }))}
            onChange={(f) => { setFuel(f); setActiveIdx(0) }}
          />

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Brand Select */}
          <FilterSelect
            icon={Building2}
            value={brand}
            options={BRANDS}
            onChange={(b) => { setBrand(b); setActiveIdx(0) }}
          />

          {/* Sort Select */}
          <FilterSelect
            icon={ArrowUpDown}
            value={sortBy}
            options={SORT_OPTIONS}
            onChange={(s) => { setSortBy(s); setActiveIdx(0) }}
          />
        </div>

        {/* ── Results ── */}
        <div ref={listRef} className="overflow-y-auto flex-1">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
              <Search size={28} className="text-gray-700" />
              <p className="text-gray-500 font-mono text-sm">Sin resultados para "{query}"</p>
              <p className="text-gray-700 text-xs">Prueba con otro nombre, marca o cambia los filtros</p>
            </div>
          ) : (
            results.map((s, i) => {
              const isActive = i === activeIdx
              const cfg = FUEL_TYPES[fuel]
              return (
                <button
                  key={s.id}
                  ref={el => itemRefs.current[i] = el}
                  onClick={() => handleSelect(s)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-white/6' : 'hover:bg-white/4'
                  }`}
                  style={{
                    animationDelay: `${i * 20}ms`,
                    animation: 'fadeSlideIn 0.2s ease-out both',
                  }}
                >
                  {/* Price badge */}
                  <div
                    className="w-[58px] flex-shrink-0 text-center py-1.5 rounded-xl"
                    style={{ background: cfg?.color + '15' }}
                  >
                    {s._price ? (
                      <>
                        <div className="text-[15px] font-display font-bold leading-none" style={{ color: cfg?.color }}>
                          {s._price.price.toLocaleString('es-CO')}
                        </div>
                        <div className="text-[8px] font-mono mt-0.5" style={{ color: cfg?.color + '80' }}>COP</div>
                      </>
                    ) : (
                      <span className="text-[11px] font-mono text-gray-700">S/D</span>
                    )}
                  </div>

                  {/* Station info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-white truncate">{s.name}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">{s.brand}</p>
                    {s.address && (
                      <p className="text-[10px] text-gray-700 truncate flex items-center gap-1 mt-0.5">
                        <MapPin size={8} />
                        {s.address}
                      </p>
                    )}
                  </div>

                  {/* Right meta */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                    {s._dist !== null && (
                      <span className="text-[11px] font-mono text-gray-400">{formatDist(s._dist)}</span>
                    )}
                    {s._price && (
                      <span className="text-[9px] font-mono text-gray-600 flex items-center gap-0.5">
                        <Clock size={8} />
                        {formatRelativeTime(s._price.created_at)}
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[9px] font-mono text-gray-700 mt-0.5">↵ seleccionar</span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-[9px] font-mono text-gray-700">
          <span>{results.length} {results.length === 1 ? 'estación' : 'estaciones'}</span>
          <span className="hidden sm:block">↑↓ navegar · ↵ abrir · ESC cerrar</span>
        </div>
      </div>
    </div>,
    document.body
  )
}
