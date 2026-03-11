import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FilterSelect({ value, options, onChange, icon: Icon, label, activeColor, className }) {
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
    <div className={cn("relative", className)} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono transition-all border",
          isActive
            ? "bg-white/10 text-white border-white/20"
            : "text-gray-500 border-white/5 hover:border-white/10"
        )}
        style={isActive && activeColor ? { background: activeColor + '15', color: activeColor, borderColor: activeColor + '30' } : {}}
      >
        {Icon && <Icon size={12} className="opacity-70" />}
        <span className="truncate max-w-[80px]">{selectedOption}</span>
        <ChevronDown size={10} className={cn("transition-transform duration-200", open && "rotate-180")} />
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
                className={cn(
                  "w-full text-left px-3 py-1.5 text-[11px] font-mono transition-colors",
                  isSelected ? "bg-white/10 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
                )}
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
