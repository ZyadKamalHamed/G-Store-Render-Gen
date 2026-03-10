import { useState } from 'react'

const tips = [
  'Input image should be 21:9 for best results',
  'The more iterations, the worse the quality — get as much right in the first prompt',
  'When adding people: [fill in]',
  'Leonardo settings: Model = Nano Banana 2 or Nano Banana Pro | Dimensions = custom 21:9 wide | Large 4K: 6336×2688 | Max characters: 1500',
]

export default function TipsBanner() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('tips-open') !== 'false' } catch { return true }
  })

  function toggle() {
    const next = !open
    setOpen(next)
    try { localStorage.setItem('tips-open', String(next)) } catch {}
  }

  return (
    <div className="border border-neutral-800 rounded-lg mb-6 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span>💡</span>
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
