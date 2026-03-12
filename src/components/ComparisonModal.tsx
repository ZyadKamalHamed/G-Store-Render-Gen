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
    function getPct(clientX: number) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
      setSplitPct(pct)
    }

    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      getPct(e.clientX)
    }
    function onMouseUp() { dragging.current = false }

    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return
      getPct(e.touches[0].clientX)
    }
    function onTouchEnd() { dragging.current = false }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl rounded-xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
        ref={containerRef}
      >
        {/* Labels */}
        <div className="absolute top-3 left-3 z-20 text-xs bg-black/60 text-neutral-300 px-2 py-1 rounded pointer-events-none">
          Original render
        </div>
        <div className="absolute top-3 right-3 z-20 text-xs bg-black/60 text-neutral-300 px-2 py-1 rounded pointer-events-none">
          Generated
        </div>

        {/* Invisible spacer — sizes the container to the generated image */}
        <img
          src={generatedUrl}
          alt=""
          aria-hidden
          className="w-full block opacity-0"
          style={{ maxHeight: '85vh', objectFit: 'contain' }}
        />

        {/* Generated image — clipped to right side of divider */}
        <img
          src={generatedUrl}
          alt="Generated"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
        />

        {/* Original image — clipped to left side of divider */}
        {originalPreview ? (
          <img
            src={originalPreview}
            alt="Original render"
            className="absolute inset-0 w-full h-full object-contain"
            style={{ clipPath: `inset(0 ${100 - splitPct}% 0 0)` }}
          />
        ) : null}

        {/* Divider */}
        {originalPreview ? (
          <div
            className="absolute inset-y-0 z-10 flex items-center justify-center cursor-col-resize"
            style={{ left: `${splitPct}%`, transform: 'translateX(-50%)' }}
            onMouseDown={() => { dragging.current = true }}
            onTouchStart={(e) => { e.stopPropagation(); dragging.current = true }}
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
