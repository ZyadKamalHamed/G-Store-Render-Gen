import { useEffect, useRef, useState } from 'react'

interface ComparisonModalProps {
  generatedUrl: string
  originalPreview: string | null
  onClose: () => void
}

export default function ComparisonModal({ generatedUrl, originalPreview, onClose }: ComparisonModalProps) {
  const [splitPct, setSplitPct] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100))
      setSplitPct(pct)
    }
    function onMouseUp() { dragging.current = false }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Labels */}
        <div className="absolute top-3 left-3 z-20 text-xs bg-black/60 text-neutral-300 px-2 py-1 rounded">
          Original render
        </div>
        <div className="absolute top-3 right-3 z-20 text-xs bg-black/60 text-neutral-300 px-2 py-1 rounded">
          Generated
        </div>

        {/* Generated image (full width background) */}
        <img
          src={generatedUrl}
          alt="Generated"
          className="w-full h-full object-contain block"
          style={{ maxHeight: '85vh' }}
        />

        {/* Original image clipped to left side */}
        {originalPreview ? (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${splitPct}%` }}
          >
            <img
              src={originalPreview}
              alt="Original render"
              className="w-full h-full object-contain block"
              style={{
                width: containerRef.current?.offsetWidth ?? '100%',
                maxHeight: '85vh',
              }}
            />
          </div>
        ) : null}

        {/* Divider */}
        {originalPreview ? (
          <div
            className="absolute inset-y-0 z-10 flex items-center justify-center cursor-col-resize"
            style={{ left: `${splitPct}%`, transform: 'translateX(-50%)' }}
            onMouseDown={() => { dragging.current = true }}
          >
            <div className="w-0.5 h-full bg-white/60" />
            <div className="absolute w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M4 7H1M10 7H13M4 4L1 7L4 10M10 4L13 7L10 10" stroke="#333" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        ) : null}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute bottom-3 right-3 z-20 text-xs bg-black/60 hover:bg-black/80 text-neutral-300 px-3 py-1.5 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
