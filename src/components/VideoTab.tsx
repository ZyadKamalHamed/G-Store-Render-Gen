import { useState, useRef } from 'react'

export default function VideoTab() {
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(file))
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) handleFile(file)
  }

  return (
    <div>
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #525252 20%, #525252 80%, transparent)' }} />
        <span className="relative bg-neutral-950 px-4 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          Video
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-4">
          {/* Upload */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Source render</p>
            <div
              role="button"
              aria-label="Upload source render"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[180px] flex items-center justify-center overflow-hidden ${
                isDragging ? 'border-neutral-400 bg-neutral-800' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} className="sr-only" />
              {preview ? (
                <img src={preview} alt="Source preview" className="w-full h-full object-cover max-h-[240px]" />
              ) : (
                <div className="text-center px-6 py-8">
                  <p className="text-neutral-400 text-sm">Drop your render here</p>
                  <p className="text-neutral-600 text-xs mt-1">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Prompt</p>
            <textarea
              readOnly
              rows={6}
              placeholder="Describe the motion and camera movement you want..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-neutral-500"
            />
          </div>

          {/* Advanced settings */}
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 cursor-pointer"
            >
              <span>Advanced settings</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="px-4 pb-4 border-t border-neutral-800 pt-4">
              <p className="text-xs text-neutral-600">Coming soon</p>
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            disabled
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-neutral-900 shadow-[0_2px_10px_rgba(255,255,255,0.15)] cursor-pointer"
          >
            Generate video
          </button>
        </div>

        {/* Right side placeholder */}
        <div />
      </div>

      {/* My videos empty state */}
      <div className="mt-8">
        <p className="text-sm font-medium text-neutral-200 mb-3">My videos</p>
        <div className="text-center py-12">
          <svg className="w-10 h-10 mx-auto text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-neutral-500">No videos yet.</p>
        </div>
      </div>
    </div>
  )
}
