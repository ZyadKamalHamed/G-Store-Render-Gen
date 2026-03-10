import { useState, useRef, useEffect } from 'react'
import { initImage, uploadImage, generate, pollGeneration } from '../leonardo'
import { activeClass } from '../utils/activeClass'

type Status = 'idle' | 'uploading' | 'generating' | 'polling' | 'done' | 'error'
type LoadingStatus = 'uploading' | 'generating' | 'polling'

const STATUS_LABELS: Record<LoadingStatus, string> = {
  uploading: 'Uploading image...',
  generating: 'Queuing generation...',
  polling: 'Generating...',
}

interface ImageGenSectionProps {
  copyText: string
}

export default function ImageGenSection({ copyText }: ImageGenSectionProps) {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [quantity, setQuantity] = useState<1 | 2 | 3 | 4>(1)
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  // Revoke previous object URL when preview changes to prevent memory leaks
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  function handleFile(file: File) {
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResults([])
    setErrorMsg(null)
    setStatus('idle')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  function startPolling(generationId: string) {
    setStatus('polling')
    pollIntervalRef.current = setInterval(async () => {
      try {
        const result = await pollGeneration(generationId)
        if (result.status === 'COMPLETE') {
          clearInterval(pollIntervalRef.current!)
          setResults(result.images)
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
    try {
      setStatus('uploading')
      const ext = image.type === 'image/png' ? 'png' : 'jpg'
      const { id: imageId, url, fields } = await initImage(ext)
      await uploadImage(url, fields, image)

      setStatus('generating')
      const generationId = await generate(imageId, copyText, quantity)
      startPolling(generationId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  const isLoading = status === 'uploading' || status === 'generating' || status === 'polling'

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
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-lg cursor-pointer transition-colors min-h-[180px] flex items-center justify-center overflow-hidden ${
              isDragging ? 'border-neutral-400 bg-neutral-800' : 'border-neutral-700 hover:border-neutral-500 bg-neutral-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="sr-only"
            />
            {preview ? (
              <img src={preview} alt="Upload preview" className="w-full h-full object-cover max-h-[240px]" />
            ) : (
              <div className="text-center px-6 py-8">
                <p className="text-neutral-400 text-sm">Drop your render here</p>
                <p className="text-neutral-600 text-xs mt-1">or click to browse</p>
              </div>
            )}
          </div>
          {image ? (
            <p className="text-xs text-neutral-500 -mt-2 truncate">{image.name}</p>
          ) : null}

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

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!image || isLoading}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-neutral-900 hover:bg-neutral-100 shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
          >
            {isLoading ? STATUS_LABELS[status as LoadingStatus] : 'Generate'}
          </button>

          {errorMsg ? (
            <p className="text-xs text-red-400">{errorMsg}</p>
          ) : null}
        </div>

        {/* Right — prompt preview */}
        <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 font-mono leading-relaxed whitespace-pre-wrap min-h-[180px] overflow-y-auto max-h-[400px]">
          {copyText || <span className="text-neutral-600">Your assembled prompt will appear here.</span>}
        </div>
      </div>

      {/* Results grid */}
      {(status === 'done' || isLoading) ? (
        <div className={`mt-8 grid gap-4 ${quantity === 1 ? 'grid-cols-1' : quantity === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {isLoading
            ? Array.from({ length: quantity }).map((_, i) => (
                <div key={i} className="aspect-video rounded-lg bg-neutral-800 animate-pulse" />
              ))
            : results.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden">
                  <img src={url} alt={`Generated result ${i + 1}`} className="w-full aspect-video object-cover" />
                  <a
                    href={url}
                    download={`render-${i + 1}.jpg`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-0 flex items-end justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="bg-neutral-900/80 text-white text-xs px-2 py-1 rounded">Download</span>
                  </a>
                </div>
              ))}
        </div>
      ) : null}
    </div>
  )
}
