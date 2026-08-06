import { useState } from 'react'

const tips = [
  'Use textured Vectorworks or SketchUp exports where possible. Clay renders force the model to guess materials.',
  'Enable ambient occlusion or depth shadows so objects read as grounded, not floating.',
  'Keep the main render high resolution. A short edge of at least 1440px is a good floor.',
  'Avoid heavy outline clutter on plants and small decor. Keep useful joinery and shelf lines visible.',
  'Use 16:9 or 21:9 for consistent presentations and before/after comparisons.',
]

export default function TipsBanner() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('tips-open') !== 'false' } catch { return true }
  })

  function toggle() {
    const next = !open
    setOpen(next)
    try { localStorage.setItem('tips-open', String(next)) } catch { return }
  }

  return (
    <div className="border border-neutral-800 rounded-lg mb-6 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          Tips
        </span>
        <span className={`transition-transform duration-200 text-neutral-500 text-xs ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open ? (
        <div className="px-4 pb-3 border-t border-neutral-800 animate-fade-in">
          <ul className="mt-3 space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-neutral-400 flex gap-2">
                <span className="text-neutral-600 shrink-0 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
