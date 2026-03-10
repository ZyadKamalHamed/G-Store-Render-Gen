import type { ReactNode } from 'react'
import { activeClass } from '../utils/activeClass'

interface ToggleSectionProps {
  label: string
  description?: string
  enabled: boolean
  onToggle: () => void
  children?: ReactNode
}

export default function ToggleSection({ label, description, enabled, onToggle, children }: ToggleSectionProps) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium text-neutral-200">{label}</p>
          {description ? <p className="text-xs text-neutral-500 mt-0.5">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`w-14 h-8 rounded-md text-xs font-semibold transition-all duration-150 shrink-0 ${activeClass(enabled)}`}
        >
          {enabled ? 'Yes' : 'No'}
        </button>
      </div>
      {enabled && children ? (
        <div className="border-t border-neutral-800 px-4 py-3 animate-fade-in">
          {children}
        </div>
      ) : null}
    </div>
  )
}
