import { useState } from 'react'
import { X, Settings, Fuel, Droplets, ChevronDown, RefreshCw, Wind, Building2, Star, Check, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { FUEL_TYPES, FUEL_ORDER } from '@/lib/fuel'
import { cn } from '@/lib/utils'
import FilterSelect from '@/components/FilterSelect'

const FUEL_ICONS = { corriente: ChevronDown, extra: Fuel, diesel: Droplets, urea: RefreshCw, gnv: Wind }
const SETTINGS_BRANDS = ['Todas', 'Terpel', 'Biomax', 'Primax', 'Shell', 'Mobil', 'EDS', 'Petrobras', 'Gulf', 'Texaco', 'Zeuss', 'Puma']

export default function SettingsModal() {
  const { 
    settingsModalOpen, setSettingsModalOpen, 
    defaultFuelType, setDefaultFuelType,
    preferredBrand, setPreferredBrand,
    filterByPreferredBrand, setFilterByPreferredBrand,
    filterByFavorite, setFilterByFavorite,
    favoriteStationId
  } = useAppStore()

  const [expandedSection, setExpandedSection] = useState('fuel') // 'fuel' | 'brand'
  const [brandSearchTerm, setBrandSearchTerm] = useState('')

  if (!settingsModalOpen) return null

  const toggleSection = (s) => setExpandedSection(expandedSection === s ? null : s)

  return (
    <div
      className="fixed inset-0 z-[900] flex items-end sm:items-center justify-center font-body"
      onClick={(e) => e.target === e.currentTarget && setSettingsModalOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-sm bg-surface-card border border-white/10 rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-fade-up max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-fuel-500/20 border border-fuel-500/30 flex items-center justify-center">
              <Settings size={14} className="text-fuel-500" />
            </div>
            <h2 className="font-display font-bold text-[18px]">Configuración</h2>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">

          {/* ── Section 1: Fuel Selection ── */}
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-surface-muted/5">
            <button
              onClick={() => toggleSection('fuel')}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-fuel-500/10 text-fuel-500">
                  <Fuel size={16} />
                </div>
                <div>
                  <span className="text-[13px] font-bold text-white block">Combustible por defecto</span>
                  <span className="text-[10px] text-gray-500 font-mono">Elige qué precio ver en el mapa</span>
                </div>
              </div>
              <ChevronDown size={16} className={cn("text-gray-600 transition-transform duration-300", expandedSection === 'fuel' && "rotate-180")} />
            </button>

            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              expandedSection === 'fuel' ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="p-4 pt-2 space-y-2">
                  {FUEL_ORDER.map((ft) => {
                    const config = FUEL_TYPES[ft]
                    const Icon = FUEL_ICONS[ft]
                    const isSelected = defaultFuelType === ft

                    return (
                      <button
                        key={ft}
                        type="button"
                        onClick={() => setDefaultFuelType(ft)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left group',
                          isSelected
                            ? `${config.borderClass} bg-surface-muted/40`
                            : 'border-white/8 bg-surface-muted/10 hover:border-white/15'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                          isSelected ? config.bgClass : 'bg-white/5'
                        )}>
                          <Icon size={14} className={isSelected ? config.textClass : 'text-gray-600 group-hover:text-gray-400'} />
                        </div>
                        <span className={cn(
                          'text-[13px] font-medium flex-1 transition-colors',
                          isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'
                        )}>
                          {config.label}
                        </span>
                        <div className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 relative overflow-hidden',
                          isSelected ? `${config.borderClass.replace('/40', '')} bg-fuel-500/10` : 'border-white/10'
                        )}>
                          {isSelected && <Check size={10} className={config.textClass} strokeWidth={4} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 2: Preferred Station/Brand ── */}
          <div className="border border-white/5 rounded-2xl overflow-hidden bg-surface-muted/5">
            <button
              onClick={() => toggleSection('brand')}
              className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-400/10 text-amber-400">
                  <Star size={16} />
                </div>
                <div>
                  <span className="text-[13px] font-bold text-white block">Gasolinera predilecta</span>
                  <span className="text-[10px] text-gray-500 font-mono">Filtra por tu marca o favorita</span>
                </div>
              </div>
              <ChevronDown size={16} className={cn("text-gray-600 transition-transform duration-300", expandedSection === 'brand' && "rotate-180")} />
            </button>

            <div className={cn(
              "grid transition-all duration-300 ease-in-out",
              expandedSection === 'brand' ? "grid-rows-[1fr] opacity-100 shadow-inner" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="p-4 pt-2 space-y-3">
                  {/* Brand Card Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] uppercase font-mono font-bold text-gray-500 block">Marca favorita</label>
                      {brandSearchTerm && (
                        <button onClick={() => setBrandSearchTerm('')} className="text-[10px] text-fuel-500 font-mono hover:underline">Limpiar</button>
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search size={14} className="text-gray-500 group-focus-within:text-fuel-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar marca..."
                        value={brandSearchTerm}
                        onChange={(e) => setBrandSearchTerm(e.target.value)}
                        className="w-full bg-surface-muted/20 border border-white/5 focus:border-fuel-500/50 rounded-xl py-2 pl-9 pr-4 text-[13px] text-white placeholder:text-gray-600 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar-thin pr-1 -mr-1 border-b border-white/5 pb-3 no-scrollbar">
                      {SETTINGS_BRANDS
                        .filter(b => b === 'Todas' || b.toLowerCase().includes(brandSearchTerm.toLowerCase()))
                        .map((b) => {
                          const isSelected = (preferredBrand || 'Todas') === b
                          return (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setPreferredBrand(b === 'Todas' ? null : b)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left group',
                                isSelected
                                  ? 'border-amber-400/40 bg-amber-400/10'
                                  : 'border-white/8 bg-surface-muted/10 hover:border-white/15'
                              )}
                            >
                              <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0',
                                isSelected ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5'
                              )}>
                                <Building2 size={14} className={isSelected ? 'text-amber-400' : 'text-gray-600 group-hover:text-gray-400'} />
                              </div>
                              <span className={cn(
                                'text-[13px] font-medium flex-1 transition-colors',
                                isSelected ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'
                              )}>
                                {b}
                              </span>
                              <div className={cn(
                                'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 relative overflow-hidden',
                                isSelected ? 'border-amber-400/60 bg-amber-400/10' : 'border-white/10'
                              )}>
                                {isSelected && <Check size={10} className="text-amber-400" strokeWidth={4} />}
                              </div>
                            </button>
                          )
                        })}
                      
                      {SETTINGS_BRANDS.filter(b => b.toLowerCase().includes(brandSearchTerm.toLowerCase())).length === 0 && (
                        <div className="py-8 text-center text-gray-700 font-mono text-[11px]">
                          No se encontraron marcas
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filter Switches */}
                  <div className="space-y-2 pt-1 font-body">
                    {preferredBrand && (
                      <button
                        onClick={() => setFilterByPreferredBrand(!filterByPreferredBrand)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left",
                          filterByPreferredBrand ? "border-fuel-500/40 bg-fuel-500/10" : "border-white/8 bg-surface-muted/10 hover:border-white/15"
                        )}
                      >
                        <div className="flex-1 pr-4">
                          <span className={cn("text-[13px] font-medium block", filterByPreferredBrand ? "text-white" : "text-gray-400")}>Auto-filtrar por marca</span>
                          <span className="text-[10px] text-gray-600 block leading-tight mt-0.5">Muestra solo {preferredBrand} al abrir la app</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-300 flex-shrink-0",
                          filterByPreferredBrand ? "bg-fuel-500" : "bg-white/10"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                            filterByPreferredBrand ? "left-[18px]" : "left-[2px]"
                          )} />
                        </div>
                      </button>
                    )}

                    {favoriteStationId && (
                      <button
                        onClick={() => {
                          const next = !filterByFavorite
                          setFilterByFavorite(next)
                          if (next) setFilterByPreferredBrand(false)
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3.5 py-3 rounded-xl border transition-all text-left",
                          filterByFavorite ? "border-amber-400/40 bg-amber-400/10" : "border-white/8 bg-surface-muted/10 hover:border-white/15"
                        )}
                      >
                        <div className="flex-1 pr-4">
                          <span className={cn("text-[13px] font-medium block", filterByFavorite ? "text-amber-400" : "text-gray-400")}>Solo Estación Favorita ★</span>
                          <span className="text-[10px] text-gray-600 block leading-tight mt-0.5">Ignora el resto de estaciones en el mapa</span>
                        </div>
                        <div className={cn(
                          "w-8 h-4 rounded-full relative transition-colors duration-300 flex-shrink-0",
                          filterByFavorite ? "bg-amber-400" : "bg-white/10"
                        )}>
                          <div className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-surface-card transition-all shadow-sm",
                            filterByFavorite ? "left-[18px]" : "left-[2px]"
                          )} />
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>


          <p className="text-[10px] text-gray-700 text-center pb-1 pt-2 font-mono">
            La preferencia se guarda automáticamente en este dispositivo.
          </p>
        </div>
      </div>
    </div>
  )
}
