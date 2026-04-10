import { cn } from '@/lib/utils'

export default function BrandFilterChips({ brands, activeBrand, onSelect, className }) {
  // Ensure "Todas" is at the start
  const displayBrands = ['Todas', ...brands.filter(b => b !== 'Todas')]

  return (
    <div className={cn("overflow-x-auto no-scrollbar", className)}>
      <div className="flex items-center gap-1.5 w-max">
        {displayBrands.map(b => {
          const isActive = activeBrand === b
          return (
            <button
              key={b}
              onClick={() => onSelect(b)}
              className={cn(
                "px-3 py-1.5 rounded-full text-[11px] font-mono font-medium transition-all duration-200 flex-shrink-0 snap-start",
                isActive
                  ? "bg-white text-surface text-black"
                  : "bg-surface-muted/30 border border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              )}
            >
              {b}
            </button>
          )
        })}
      </div>
    </div>
  )
}
