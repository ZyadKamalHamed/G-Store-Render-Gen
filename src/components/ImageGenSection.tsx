import { useState, useRef, useEffect } from 'react'
import { uploadRender, generate, pollGeneration, type GenerateSettings } from '../leonardo'
import { activeClass } from '../utils/activeClass'
import ComparisonModal from './ComparisonModal'

type Status = 'idle' | 'uploading' | 'generating' | 'polling' | 'done' | 'error'
type Strength = 'LOW' | 'MID' | 'HIGH'

interface AspectRatio { label: string; width: number; height: number }
const ASPECT_RATIOS: AspectRatio[] = [
  { label: 'Ultra-wide', width: 1584, height: 672 },
  { label: 'Square', width: 1024, height: 1024 },
  { label: 'Portrait', width: 768, height: 1024 },
]

interface GenerationEntry {
  url: string
  generatedAt: number
}

interface RefImage {
  file: File
  preview: string
}

const MAX_REFS = 8
const EXPIRY_MS = 24 * 60 * 60 * 1000

function timeAgo(ts: number): string {
  if (ts === 0) return 'unknown age'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function loadResults(): GenerationEntry[] {
  try {
    const raw = JSON.parse(localStorage.getItem('gen-results') ?? '[]')
    return raw.map((item: string | GenerationEntry) =>
      typeof item === 'string' ? { url: item, generatedAt: 0 } : item
    )
  } catch { return [] }
}

interface ImageGenSectionProps {
  copyText: string
}

export default function ImageGenSection({ copyText }: ImageGenSectionProps) {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [refImages, setRefImages] = useState<RefImage[]>([])
  const [quantity, setQuantity] = useState<1 | 2 | 3 | 4>(1)
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<GenerationEntry[]>(loadResults)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [compareEntry, setCompareEntry] = useState<GenerationEntry | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(ASPECT_RATIOS[0])
  const [mainStrength, setMainStrength] = useState<Strength>('HIGH')
  const [refStrength, setRefStrength] = useState<Strength>('LOW')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  useEffect(() => {
    return () => { refImages.forEach((r) => URL.revokeObjectURL(r.preview)) }
  }, [refImages])

  function handleFile(file: File) {
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setErrorMsg(null)
    setStatus('idle')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  function onRefFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_REFS - refImages.length
    const toAdd = files.slice(0, remaining).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }))
    setRefImages((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removeRef(index: number) {
    setRefImages((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  function copyToClipboard(url: string) {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopiedUrl(null), 1500)
  }

  function startPolling(generationId: string) {
    setStatus('polling')
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await pollGeneration(generationId)
        if (result.status === 'COMPLETE') {
          clearInterval(pollIntervalRef.current!)
          const now = Date.now()
          setResults((prev) => {
            const updated = [...result.images.map((url) => ({ url, generatedAt: now })), ...prev]
            localStorage.setItem('gen-results', JSON.stringify(updated))
            return updated
          })
          setStatus('done')
        } else if (result.status === 'FAILED') {
          clearInterval(pollIntervalRef.current!)
          setErrorMsg('Generation failed on Leonardo servers.')
          setStatus('error')
        }
      } catch (err) {
        clearInterval(pollIntervalRef.current!)
        setErrorMsg(err instanceof Error ? err.message : 'Polling error')
        setStatus('error')
      }
    }, 3000)
  }

  async function handleGenerate() {
    if (!image) return
    setErrorMsg(null)
    setResults([])
    const total = 1 + refImages.length
    setUploadProgress({ done: 0, total })
    try {
      setStatus('uploading')
      const allFiles = [image, ...refImages.map((r) => r.file)]
      const ids = await Promise.all(
        allFiles.map((file) =>
          uploadRender(file).then((id) => {
            setUploadProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : null)
            return id
          })
        )
      )
      const [mainImageId, ...refImageIds] = ids
      setUploadProgress(null)

      const settings: GenerateSettings = {
        width: aspectRatio.width,
        height: aspectRatio.height,
        mainStrength,
        refStrength,
      }
      setStatus('generating')
      const generationId = await generate(mainImageId, refImageIds, editedPrompt ?? copyText, quantity, settings)
      startPolling(generationId)
    } catch (err) {
      setUploadProgress(null)
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const isLoading = status === 'uploading' || status === 'generating' || status === 'polling'

  function statusLabel() {
    if (status === 'uploading' && uploadProgress) {
      return `Uploading ${uploadProgress.done}/${uploadProgress.total}...`
    }
    if (status === 'generating') return 'Queuing generation...'
    if (status === 'polling') return 'Generating...'
    return 'Generate'
  }

  function strengthPills(value: Strength, onChange: (v: Strength) => void) {
    return (
      <div className="flex gap-1">
        {(['LOW', 'MID', 'HIGH'] as Strength[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 ${activeClass(value === s)}`}
          >
            {s[0] + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Divider */}
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #525252 20%, #525252 80%, transparent)' }} />
        <span className="relative bg-neutral-950 px-4 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          Generate
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left — upload + controls */}
        <div className="flex flex-col gap-4">
          {/* Main render drop zone */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Main render</p>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[180px] flex items-center justify-center overflow-hidden ${
                isDragging ? 'border-neutral-400 bg-neutral-800' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="sr-only" />
              {preview ? (
                <img src={preview} alt="Main render preview" className="w-full h-full object-cover max-h-[240px]" />
              ) : (
                <div className="text-center px-6 py-8">
                  <p className="text-neutral-400 text-sm">Drop your render here</p>
                  <p className="text-neutral-600 text-xs mt-1">or click to browse</p>
                </div>
              )}
            </div>
            {image ? <p className="text-xs text-neutral-500 mt-1 truncate">{image.name}</p> : null}
          </div>

          {/* Reference images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-200">
                Reference images
                <span className="text-neutral-600 font-normal ml-2">({refImages.length}/{MAX_REFS})</span>
              </p>
              {refImages.length < MAX_REFS ? (
                <button type="button" onClick={() => refInputRef.current?.click()} className="text-xs text-neutral-400 hover:text-white transition-colors">
                  + Add
                </button>
              ) : null}
            </div>
            <input ref={refInputRef} type="file" accept="image/*" multiple onChange={onRefFilesChange} className="sr-only" />
            {refImages.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {refImages.map((ref, i) => (
                  <div key={i} className="relative group aspect-square rounded-md overflow-hidden bg-neutral-800">
                    <img src={ref.preview} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeRef(i)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {refImages.length < MAX_REFS ? (
                  <button
                    type="button"
                    onClick={() => refInputRef.current?.click()}
                    className="aspect-square rounded-md border-2 border-dashed border-neutral-700 hover:border-neutral-500 flex items-center justify-center text-neutral-600 hover:text-neutral-400 transition-colors text-xl"
                  >
                    +
                  </button>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => refInputRef.current?.click()}
                className="w-full border-2 border-dashed border-neutral-800 hover:border-neutral-700 rounded-lg py-4 text-xs text-neutral-600 hover:text-neutral-500 transition-colors"
              >
                Add colour palettes, material references, etc. (optional)
              </button>
            )}
          </div>

          {/* Quantity */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Quantity</p>
            <div className="flex gap-2">
              {([1, 2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQuantity(n)}
                  className={`w-10 h-10 rounded-md text-sm font-semibold transition-all duration-150 ${activeClass(quantity === n)}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings */}
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <span>Advanced settings</span>
              <svg className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {settingsOpen ? (
              <div className="px-4 pb-4 flex flex-col gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <p className="text-xs text-neutral-400 mb-2">Aspect ratio</p>
                  <div className="flex gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.label}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 ${activeClass(aspectRatio.label === ar.label)}`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-2">Main render influence</p>
                  {strengthPills(mainStrength, setMainStrength)}
                </div>
                {refImages.length > 0 ? (
                  <div>
                    <p className="text-xs text-neutral-400 mb-2">Reference image influence</p>
                    {strengthPills(refStrength, setRefStrength)}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!image || isLoading}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-neutral-900 hover:bg-neutral-100 shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
          >
            {statusLabel()}
          </button>

          {errorMsg ? <p className="text-xs text-red-400">{errorMsg}</p> : null}
        </div>

        {/* Right — prompt (editable) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-200">Prompt</p>
            {editedPrompt !== null ? (
              <button type="button" onClick={() => setEditedPrompt(null)} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors">
                Reset
              </button>
            ) : null}
          </div>
          <textarea
            value={editedPrompt ?? copyText}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={12}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-neutral-500 overflow-y-auto"
            placeholder="Your assembled prompt will appear here."
          />
        </div>
      </div>

      {/* Results grid */}
      {(results.length > 0 || isLoading) ? (
        <div className="mt-8">
          {results.length > 0 && !isLoading ? (
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs text-neutral-500">{results.length} image{results.length !== 1 ? 's' : ''} generated</p>
              <button
                type="button"
                onClick={() => { setResults([]); localStorage.removeItem('gen-results') }}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Clear history
              </button>
            </div>
          ) : null}
          <div className={`grid gap-4 ${quantity === 1 ? 'grid-cols-1' : quantity === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {isLoading
              ? Array.from({ length: quantity }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-lg bg-neutral-800 animate-pulse" />
                ))
              : results.map((entry, i) => {
                  const expired = entry.generatedAt > 0 && Date.now() - entry.generatedAt > EXPIRY_MS
                  return (
                    <div key={i} className="relative group rounded-lg overflow-hidden bg-neutral-900">
                      <img
                        src={entry.url}
                        alt={`Generated result ${i + 1}`}
                        className="w-full aspect-video object-cover cursor-pointer"
                        onClick={() => setCompareEntry(entry)}
                      />
                      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1.5 bg-neutral-900/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-neutral-500">{timeAgo(entry.generatedAt)}</span>
                        <div className="flex gap-1.5 items-center">
                          {expired ? (
                            <span className="text-xs text-amber-500">Expired</span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(entry.url)}
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            {copiedUrl === entry.url ? 'Copied!' : 'Copy'}
                          </button>
                          <a
                            href={entry.url}
                            download={`render-${i + 1}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            onClick={() => setCompareEntry(entry)}
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors"
                          >
                            Compare
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
          </div>
        </div>
      ) : null}

      {compareEntry ? (
        <ComparisonModal
          generatedUrl={compareEntry.url}
          originalPreview={preview}
          onClose={() => setCompareEntry(null)}
        />
      ) : null}
    </div>
  )
}
