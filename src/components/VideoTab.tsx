import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { uploadRender, generateVideo, pollVideo } from '../leonardo'
import { activeClass } from '../utils/activeClass'
import { supabase } from '../lib/supabase'

type VideoModel = 'VEO3_1' | 'kling-3.0'
type Status = 'idle' | 'uploading' | 'generating' | 'polling' | 'done' | 'error'
type SourceMode = 'upload' | 'gallery'

interface GalleryImage {
  url: string
}

const PRESETS: { label: string; prompt: string }[] = [
  {
    label: 'Pan In',
    prompt: 'Smooth cinematic push in toward the subject. The camera glides forward steadily. Nothing in the scene moves aside from the camera.',
  },
  {
    label: 'Pan Out',
    prompt: 'Slow cinematic pull out revealing the wider environment. The camera retreats smoothly backward. Nothing in the scene moves aside from the camera.',
  },
  {
    label: 'Dolly Left',
    prompt: 'Smooth lateral tracking shot moving left across the scene. The camera slides parallel to the subject at a steady pace. Nothing in the scene moves aside from the camera.',
  },
  {
    label: 'Dolly Right',
    prompt: 'Smooth lateral tracking shot moving right across the scene. The camera slides parallel to the subject at a steady pace. Nothing in the scene moves aside from the camera.',
  },
]

const DIMENSIONS: Record<VideoModel, { label: string; w: number; h: number }[]> = {
  VEO3_1: [
    { label: '16:9', w: 1920, h: 1080 },
    { label: '9:16', w: 1080, h: 1920 },
  ],
  'kling-3.0': [
    { label: '16:9', w: 1920, h: 1080 },
    { label: '1:1', w: 1440, h: 1440 },
    { label: '9:16', w: 1080, h: 1920 },
  ],
}

const DURATIONS: Record<VideoModel, number[]> = {
  VEO3_1: [4, 6, 8],
  'kling-3.0': [5, 10],
}

interface VideoEntry {
  url: string
  createdAt: number
}

export default function VideoTab({ user }: { user: User }) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourcePreview, setSourcePreview] = useState<string | null>(null)
  const [selectedGallery, setSelectedGallery] = useState<GalleryImage | null>(null)
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)

  const [model, setModel] = useState<VideoModel>('VEO3_1')
  const [prompt, setPrompt] = useState('')
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [duration, setDuration] = useState(8)
  const [dimIndex, setDimIndex] = useState(0)

  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoEntry[]>([])

  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isGeneratingRef = useRef(false)

  // Load gallery images from Supabase
  useEffect(() => {
    async function loadGallery() {
      setGalleryLoading(true)
      const { data } = await supabase
        .from('generations')
        .select('image_urls, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      const images: GalleryImage[] = (data ?? []).flatMap((row: { image_urls: string[] }) =>
        row.image_urls.map((url) => ({ url }))
      )
      setGalleryImages(images)
      setGalleryLoading(false)
    }
    loadGallery()
  }, [])

  // Reset duration and aspect ratio when model changes
  useEffect(() => {
    setDuration(model === 'VEO3_1' ? 8 : 5)
    setDimIndex(0)
  }, [model])

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (sourcePreview) URL.revokeObjectURL(sourcePreview)
    }
  }, [sourcePreview])

  function handleFile(file: File) {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview)
    setSourceFile(file)
    setSourcePreview(URL.createObjectURL(file))
    setSelectedGallery(null)
    setErrorMsg(null)
    setStatus('idle')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleFile(file)
  }

  function selectGalleryImage(img: GalleryImage) {
    setSelectedGallery(img)
    setSourceFile(null)
    if (sourcePreview) URL.revokeObjectURL(sourcePreview)
    setSourcePreview(null)
    setErrorMsg(null)
    setStatus('idle')
  }

  function selectPreset(preset: typeof PRESETS[number]) {
    setPrompt(preset.prompt)
    setActivePreset(preset.label)
  }

  const hasSource = sourceFile !== null || selectedGallery !== null
  const currentPreview = sourcePreview ?? selectedGallery?.url ?? null
  const dims = DIMENSIONS[model]
  const durations = DURATIONS[model]
  const isLoading = status === 'uploading' || status === 'generating' || status === 'polling'

  function statusLabel() {
    if (status === 'uploading') return 'Uploading image...'
    if (status === 'generating') return 'Queuing video...'
    if (status === 'polling') return 'Rendering...'
    return 'Generate video'
  }

  async function handleGenerate() {
    if (!hasSource || !prompt.trim() || isGeneratingRef.current) return
    isGeneratingRef.current = true
    setErrorMsg(null)
    setStatus('uploading')

    try {
      let imageId: string

      if (sourceFile) {
        imageId = await uploadRender(sourceFile)
      } else {
        // Gallery image: fetch blob and upload to Leonardo
        const resp = await fetch(selectedGallery!.url)
        const blob = await resp.blob()
        const file = new File([blob], 'gallery-source.jpg', { type: blob.type || 'image/jpeg' })
        imageId = await uploadRender(file)
      }

      setStatus('generating')
      const { w, h } = dims[dimIndex]
      const generationId = await generateVideo(model, imageId, prompt, duration, w, h)

      // Start polling
      setStatus('polling')
      let attempts = 0
      const MAX_ATTEMPTS = 60 // 60 * 5s = 5 minutes
      pollIntervalRef.current = setInterval(async () => {
        attempts++
        if (attempts > MAX_ATTEMPTS) {
          clearInterval(pollIntervalRef.current!)
          isGeneratingRef.current = false
          setErrorMsg('Video generation timed out after 5 minutes. Try again.')
          setStatus('error')
          return
        }
        try {
          const result = await pollVideo(generationId)
          if (result.status === 'COMPLETE') {
            clearInterval(pollIntervalRef.current!)
            isGeneratingRef.current = false
            const now = Date.now()
            const newEntries = result.videos.map((url) => ({ url, createdAt: now }))
            setVideos((prev) => [...newEntries, ...prev])
            setStatus('done')
          } else if (result.status === 'FAILED') {
            clearInterval(pollIntervalRef.current!)
            isGeneratingRef.current = false
            setErrorMsg('Video generation failed on Leonardo servers.')
            setStatus('error')
          }
        } catch (err) {
          clearInterval(pollIntervalRef.current!)
          isGeneratingRef.current = false
          setErrorMsg(err instanceof Error ? err.message : 'Polling error')
          setStatus('error')
        }
      }, 5000)
    } catch (err) {
      isGeneratingRef.current = false
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    }
  }

  return (
    <div>
      {/* Divider */}
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #525252 20%, #525252 80%, transparent)' }} />
        <span className="relative bg-neutral-950 px-4 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          Video
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Source image */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-200">Source image</p>
              <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
                {(['upload', 'gallery'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSourceMode(mode)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${activeClass(sourceMode === mode)}`}
                  >
                    {mode === 'upload' ? 'Upload new' : 'From gallery'}
                  </button>
                ))}
              </div>
            </div>

            {sourceMode === 'upload' ? (
              <div
                role="button"
                aria-label="Upload source image"
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
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
                  className="sr-only"
                />
                {sourcePreview ? (
                  <img src={sourcePreview} alt="Source preview" className="w-full h-full object-cover max-h-[240px]" />
                ) : (
                  <div className="text-center px-6 py-8">
                    <p className="text-neutral-400 text-sm">Drop your render here</p>
                    <p className="text-neutral-600 text-xs mt-1">or click to browse</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-neutral-800 rounded-lg p-3 max-h-[260px] overflow-y-auto">
                {galleryLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded bg-neutral-800 animate-pulse" />
                    ))}
                  </div>
                ) : galleryImages.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6">No renders yet. Generate some in the Image tab first.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectGalleryImage(img)}
                        className={`aspect-video rounded overflow-hidden cursor-pointer transition-all ${
                          selectedGallery?.url === img.url
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
                            : 'hover:opacity-80'
                        }`}
                      >
                        <img src={img.url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Model selector */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Model</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModel('VEO3_1')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  model === 'VEO3_1'
                    ? 'bg-white text-neutral-900 border-white'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <span className="text-sm font-medium block">Veo 3.1</span>
                <span className={`text-xs ${model === 'VEO3_1' ? 'text-neutral-500' : 'text-neutral-500'}`}>Stable zooms, lower quality</span>
              </button>
              <button
                type="button"
                onClick={() => setModel('kling-3.0')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-left transition-all cursor-pointer border ${
                  model === 'kling-3.0'
                    ? 'bg-white text-neutral-900 border-white'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <span className="text-sm font-medium block">Kling 3.0</span>
                <span className={`text-xs ${model === 'kling-3.0' ? 'text-neutral-500' : 'text-neutral-500'}`}>Higher quality output</span>
              </button>
            </div>
          </div>

          {/* Motion presets */}
          <div>
            <p className="text-sm font-medium text-neutral-200 mb-2">Camera motion</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${activeClass(activePreset === preset.label)}`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Aspect ratio */}
          <div className="flex gap-6">
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-2">Duration</p>
              <div className="flex gap-2">
                {durations.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${activeClass(duration === d)}`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-2">Aspect ratio</p>
              <div className="flex gap-2">
                {dims.map((dim, i) => (
                  <button
                    key={dim.label}
                    type="button"
                    onClick={() => setDimIndex(i)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer ${activeClass(dimIndex === i)}`}
                  >
                    {dim.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!hasSource || !prompt.trim() || isLoading}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-neutral-900 hover:bg-neutral-100 shadow-[0_2px_10px_rgba(255,255,255,0.15)] cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-neutral-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {statusLabel()}
          </button>

          {errorMsg ? (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs">{errorMsg}</p>
            </div>
          ) : null}
        </div>

        {/* Right column - prompt */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-200">Prompt</p>
            {prompt ? (
              <button
                type="button"
                onClick={() => { setPrompt(''); setActivePreset(null) }}
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Clear
              </button>
            ) : null}
          </div>
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setActivePreset(null) }}
            rows={8}
            placeholder="Describe the motion and camera movement you want, or click a preset above..."
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-neutral-500"
          />
          {currentPreview ? (
            <div className="mt-2">
              <p className="text-xs text-neutral-500 mb-1.5">Source preview</p>
              <img src={currentPreview} alt="Selected source" className="w-full rounded-lg object-cover max-h-[200px]" />
            </div>
          ) : null}
        </div>
      </div>

      {/* My videos */}
      <div className="mt-8">
        <p className="text-sm font-medium text-neutral-200 mb-3">My videos</p>
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {videos.map((entry, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden bg-neutral-900">
                <video
                  src={entry.url}
                  controls
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 flex items-center justify-end px-2 py-1.5 bg-neutral-900/80 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={entry.url}
                    download={`video-${i + 1}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="aspect-video max-w-md rounded-lg bg-neutral-800 animate-pulse" />
        ) : (
          <div className="text-center py-12">
            <svg className="w-10 h-10 mx-auto text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-neutral-500">No videos yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
