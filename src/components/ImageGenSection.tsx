import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { uploadRender, generate, pollGeneration, type GenerateSettings } from '../leonardo'
import { activeClass } from '../utils/activeClass'
import ComparisonModal from './ComparisonModal'
import { supabase } from '../lib/supabase'
import {
  MODEL_PROFILES,
  STYLE_OPTIONS,
  getModelProfile,
  type DimensionOption,
  type ImageModelId,
  type ImageQuality,
  type ReferenceStrength,
} from '../modelProfiles'
import { referenceRoleCopy, type ReferenceImageRole, type ReferenceRoleInstruction } from '../renderPrompt'
import { getGuestUserEmail, getGuestUserId } from '../guestUser'
import { getPromptPlatform, isOverPromptLimit, type PromptPlatformId } from '../platformProfiles'

type Status = 'idle' | 'uploading' | 'generating' | 'polling' | 'done' | 'error'

const REFERENCE_ROLE_LABELS: Record<ReferenceImageRole, string> = {
  'product-packshot': 'Product packshot',
  'material-sample': 'Material sample',
  palette: 'Palette',
  'lighting-mood': 'Lighting mood',
  'people-scale': 'People / scale',
  'exterior-context': 'Exterior context',
}

interface GenerationEntry {
  id?: string
  url: string
  generatedAt: number
  userEmail?: string
  originalRenderUrl?: string
}

interface RefImage {
  file: File
  preview: string
  role: ReferenceImageRole
}

const MAX_REFS = 5

function timeAgo(ts: number): string {
  if (ts === 0) return 'unknown age'
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface DbGeneration {
  id: string
  user_id: string
  user_email: string
  prompt: string
  image_urls: string[]
  settings: Record<string, unknown>
  created_at: string
  original_render_url?: string
}

function flattenGenerations(rows: DbGeneration[], showEmail: boolean): GenerationEntry[] {
  return rows.flatMap((row) =>
    row.image_urls.map((url) => ({
      id: row.id,
      url,
      generatedAt: new Date(row.created_at).getTime(),
      userEmail: showEmail ? row.user_email : undefined,
      originalRenderUrl: row.original_render_url ?? undefined,
    }))
  )
}

interface ImageGenSectionProps {
  copyText: string
  platformId: PromptPlatformId
  user?: User
}

export default function ImageGenSection({ copyText, platformId, user }: ImageGenSectionProps) {
  const [guestUserId] = useState(getGuestUserId)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [refImages, setRefImages] = useState<RefImage[]>([])
  const [quantity, setQuantity] = useState<1 | 2 | 3 | 4>(1)
  const [status, setStatus] = useState<Status>('idle')
  const [results, setResults] = useState<GenerationEntry[]>([])
  const [teamFeed, setTeamFeed] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [editedPrompt, setEditedPrompt] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [compareEntry, setCompareEntry] = useState<GenerationEntry | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelId, setModelId] = useState<ImageModelId>('gemini-image-2')
  const [dimension, setDimension] = useState<DimensionOption>(() => getModelProfile('gemini-image-2').dimensions[0])
  const [mainStrength, setMainStrength] = useState<ReferenceStrength>('HIGH')
  const [refStrength, setRefStrength] = useState<ReferenceStrength>('LOW')
  const [imageQuality, setImageQuality] = useState<ImageQuality>('MEDIUM')
  const [styleId, setStyleId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isGeneratingRef = useRef(false)
  const userId = user?.id ?? guestUserId
  const userEmail = user?.email ?? getGuestUserEmail()
  const signedIn = Boolean(user)

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    async function loadHistory() {
      setHistoryLoading(true)
      let query = supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (!teamFeed || !signedIn) query = query.eq('user_id', userId)
      const { data, error } = await query
      setResults(data && !error ? flattenGenerations(data as DbGeneration[], teamFeed && signedIn) : [])
      setHistoryLoading(false)
    }
    loadHistory()
  }, [teamFeed, signedIn, userId])

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  }, [preview])

  useEffect(() => {
    return () => { refImages.forEach((r) => URL.revokeObjectURL(r.preview)) }
  }, [refImages])

  useEffect(() => {
    const profile = getModelProfile(modelId)
    setDimension(profile.dimensions[0])
    if (modelId === 'gpt-image-2') setStyleId(null)
  }, [modelId])

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
      role: 'material-sample' as ReferenceImageRole,
    }))
    setRefImages((prev) => [...prev, ...toAdd])
    e.target.value = ''
  }

  function updateRefRole(index: number, role: ReferenceImageRole) {
    setRefImages((prev) => prev.map((ref, i) => i === index ? { ...ref, role } : ref))
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

  function startPolling(generationId: string, originalImageB64: string, originalImageExt: string, originalImageMime: string) {
    setStatus('polling')
    let attempts = 0
    const MAX_ATTEMPTS = 40 // 40 * 3s = 2 minutes
    pollIntervalRef.current = setInterval(async () => {
      attempts++
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(pollIntervalRef.current!)
        isGeneratingRef.current = false
        setErrorMsg('Generation timed out after 2 minutes. Try again.')
        setStatus('error')
        return
      }
      try {
        const result = await pollGeneration(generationId)
        if (result.status === 'COMPLETE') {
          clearInterval(pollIntervalRef.current!)
          isGeneratingRef.current = false
          const now = new Date().toISOString()
          const saveRes = await fetch('/api/save-generation', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              user_email: userEmail,
              prompt: finalPrompt,
              image_urls: result.images,
              settings: {
                model: modelId,
                width: dimension.width,
                height: dimension.height,
                mainStrength,
                refStrength,
                quantity,
                quality: imageQuality,
                styleId,
                referenceRoles: referenceRoleInstructions,
              },
              created_at: now,
              original_image_b64: originalImageB64,
              original_image_ext: originalImageExt,
              original_image_mime: originalImageMime,
            }),
          })
          const saveData = saveRes.ok ? await saveRes.json() : {}
          const dbId: string | undefined = saveData.id
          const savedOriginalUrl: string | undefined = saveData.original_render_url
          const newEntries = result.images.map((url) => ({
            id: dbId,
            url,
            generatedAt: new Date(now).getTime(),
            originalRenderUrl: savedOriginalUrl,
          }))
          setResults((prev) => [...newEntries, ...prev])
          setStatus('done')
        } else if (result.status === 'FAILED') {
          clearInterval(pollIntervalRef.current!)
          isGeneratingRef.current = false
          setErrorMsg('Generation failed on Leonardo servers.')
          setStatus('error')
        }
      } catch (err) {
        clearInterval(pollIntervalRef.current!)
        isGeneratingRef.current = false
        setErrorMsg(err instanceof Error ? err.message : 'Polling error')
        setStatus('error')
      }
    }, 3000)
  }

  async function handleGenerate() {
    if (!image || isGeneratingRef.current) return
    if (overPromptLimit) {
      setErrorMsg(`Prompt is ${finalPrompt.length - platform.promptLimit!} characters over ${platform.label}'s limit.`)
      return
    }
    isGeneratingRef.current = true
    setErrorMsg(null)
    setResults([])
    const total = 1 + refImages.length
    setUploadProgress({ done: 0, total })
    try {
      setStatus('uploading')
      const allFiles = [image, ...refImages.map((r) => r.file)]
      const [ids, originalImageB64] = await Promise.all([
        Promise.all(
          allFiles.map((file) =>
            uploadRender(file).then((id) => {
              setUploadProgress((prev) => prev ? { ...prev, done: prev.done + 1 } : null)
              return id
            })
          )
        ),
        new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.readAsDataURL(image)
        }),
      ])
      const [mainImageId, ...refImageIds] = ids
      setUploadProgress(null)

      const settings: GenerateSettings = {
        model: modelId,
        width: dimension.width,
        height: dimension.height,
        mainStrength,
        refStrength,
        quality: imageQuality,
        styleId,
      }
      setStatus('generating')
      const generationId = await generate(mainImageId, refImageIds, finalPrompt, quantity, settings)
      startPolling(generationId, originalImageB64, image.name.split('.').pop() ?? 'jpg', image.type)
    } catch (err) {
      setUploadProgress(null)
      isGeneratingRef.current = false
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

  const profile = getModelProfile(modelId)
  const referenceRoleInstructions: ReferenceRoleInstruction[] = refImages.map((ref, index) => ({
    role: ref.role,
    label: `reference image ${index + 2}`,
    notes: '',
  }))
  const rolePrompt = referenceRoleInstructions.length
    ? `\n\nRefs: ${referenceRoleInstructions.map(referenceRoleCopy).join(' ')}`
    : ''
  const finalPrompt = `${editedPrompt ?? copyText}${rolePrompt}`
  const platform = getPromptPlatform(platformId)
  const overPromptLimit = isOverPromptLimit(finalPrompt, platform)
  const promptCount = platform.promptLimit === null
    ? `${finalPrompt.length} chars`
    : `${finalPrompt.length} / ${platform.promptLimit}`

  function strengthPills(value: ReferenceStrength, onChange: (v: ReferenceStrength) => void) {
    return (
      <div className="flex gap-1">
        {(['LOW', 'MID', 'HIGH'] as ReferenceStrength[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${activeClass(value === s)}`}
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
              role="button"
              aria-label="Upload main render image"
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-neutral-200">
                Optional references
                <span className="text-neutral-600 font-normal ml-2">({refImages.length}/{MAX_REFS})</span>
              </p>
              {refImages.length < MAX_REFS ? (
                <button type="button" onClick={() => refInputRef.current?.click()} className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer">
                  + Add
                </button>
              ) : null}
            </div>
            <input ref={refInputRef} type="file" accept="image/*" multiple onChange={onRefFilesChange} className="sr-only" />
            {refImages.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {refImages.map((ref, i) => (
                  <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900 p-2">
                    <div className="relative group aspect-video rounded-md overflow-hidden bg-neutral-800">
                      <img src={ref.preview} alt={`Reference image ${i + 2}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRef(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-neutral-900/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        x
                      </button>
                    </div>
                    <label className="mt-2 block text-[11px] text-neutral-500" htmlFor={`ref-role-${i}`}>
                      Reference image {i + 2} role
                    </label>
                    <select
                      id={`ref-role-${i}`}
                      value={ref.role}
                      onChange={(e) => updateRefRole(i, e.target.value as ReferenceImageRole)}
                      className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-neutral-500"
                    >
                      {(Object.keys(REFERENCE_ROLE_LABELS) as ReferenceImageRole[]).map((role) => (
                        <option key={role} value={role}>{REFERENCE_ROLE_LABELS[role]}</option>
                      ))}
                    </select>
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
                Add product packshots, material samples, palettes, lighting references, or people for scale
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-2">Quantity</p>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuantity(n)}
                    className={`w-10 h-10 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer ${activeClass(quantity === n)}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200 mb-2">Model</p>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value as ImageModelId)}
                className="h-10 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
              >
                {MODEL_PROFILES.map((model) => (
                  <option key={model.id} value={model.id}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
            >
              <span>Advanced settings</span>
              <svg className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {settingsOpen ? (
              <div className="px-4 pb-4 flex flex-col gap-4 border-t border-neutral-800 pt-4">
                <div>
                  <p className="text-xs text-neutral-400 mb-1">Model behavior</p>
                  <p className="text-xs text-neutral-600">{profile.description}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400 mb-2">Output dimensions</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.dimensions.map((option) => (
                      <button
                        key={`${option.width}-${option.height}`}
                        type="button"
                        onClick={() => setDimension(option)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${activeClass(dimension.width === option.width && dimension.height === option.height)}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1.5">{dimension.width} x {dimension.height}px</p>
                </div>

                {profile.supportsQuality ? (
                  <div>
                    <p className="text-xs text-neutral-400 mb-2">GPT Image 2 quality</p>
                    <div className="flex gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH'] as ImageQuality[]).map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setImageQuality(quality)}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${activeClass(imageQuality === quality)}`}
                        >
                          {quality[0] + quality.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-neutral-400 mb-2">Style preset</p>
                    <div className="flex flex-wrap gap-2">
                      {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.id ?? 'none'}
                        type="button"
                        onClick={() => setStyleId(style.id)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${activeClass(styleId === style.id)}`}
                      >
                        {style.label}
                      </button>
                      ))}
                    </div>
                  </div>
                )}

                {profile.supportsReferenceStrength ? (
                  <div>
                    <p className="text-xs text-neutral-400 mb-2">Main render influence</p>
                    {strengthPills(mainStrength, setMainStrength)}
                    {refImages.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs text-neutral-400 mb-2">Optional reference influence</p>
                        {strengthPills(refStrength, setRefStrength)}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!image || isLoading || overPromptLimit}
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
          {overPromptLimit ? (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
              Prompt is {promptCount} characters for {platform.label}. Shorten the brief before generating.
            </div>
          ) : null}
        </div>

        {/* Right — prompt (editable) */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-neutral-200">Prompt</p>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono tabular-nums ${overPromptLimit ? 'text-red-400' : 'text-neutral-500'}`}>
                {promptCount}
              </span>
              {editedPrompt !== null ? (
                <button type="button" onClick={() => setEditedPrompt(null)} className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer">
                  Reset
                </button>
              ) : null}
            </div>
          </div>
          <textarea
            value={editedPrompt ?? copyText}
            onChange={(e) => setEditedPrompt(e.target.value)}
            rows={12}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 font-mono leading-relaxed resize-none focus:outline-none focus:border-neutral-500 overflow-y-auto"
            placeholder="Your assembled prompt will appear here."
          />
          {referenceRoleInstructions.length > 0 ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
              <p className="text-xs font-medium text-neutral-400 mb-1">Reference roles appended at generation</p>
              <p className="text-xs text-neutral-600 whitespace-pre-wrap leading-relaxed">{rolePrompt.trim()}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Results grid */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!teamFeed}
              onClick={() => setTeamFeed(false)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${!teamFeed ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
            >
              My renders
            </button>
            {signedIn ? (
              <button
                type="button"
                role="tab"
                aria-selected={teamFeed}
                onClick={() => setTeamFeed(true)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${teamFeed ? 'bg-white text-neutral-900' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                Team feed
              </button>
            ) : null}
          </div>
          {!teamFeed && results.length > 0 && !isLoading ? (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors cursor-pointer"
            >
              Clear my history
            </button>
          ) : null}
        </div>
        {(results.length > 0 || isLoading || historyLoading) ? (
          <div className={`grid gap-4 ${quantity === 1 ? 'grid-cols-1' : quantity === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
            {isLoading || historyLoading
              ? Array.from({ length: quantity }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-lg bg-neutral-800 animate-pulse" />
                ))
              : results.map((entry, i) => {
                  return (
                    <div key={i} className="relative group rounded-lg overflow-hidden bg-neutral-900">
                      <img
                        src={entry.url}
                        alt={`Generated result ${i + 1}`}
                        className="w-full aspect-video object-cover cursor-pointer"
                        onClick={() => setCompareEntry(entry)}
                      />
                      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1.5 bg-neutral-900/80 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-neutral-500">
                          {entry.userEmail ? `${entry.userEmail.split('@')[0]} · ` : ''}{timeAgo(entry.generatedAt)}
                        </span>
                        <div className="flex gap-1.5 items-center">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(entry.url)}
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            {copiedUrl === entry.url ? 'Copied!' : 'Copy'}
                          </button>
                          <a
                            href={entry.url}
                            download={`render-${i + 1}.jpg`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Download
                          </a>
                          <button
                            type="button"
                            onClick={() => setCompareEntry(entry)}
                            className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Compare
                          </button>
                          {entry.id && !teamFeed ? (
                            confirmDeleteId === entry.id ? (
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await supabase.from('generations').delete().eq('id', entry.id)
                                    setResults((prev) => prev.filter((r) => r.id !== entry.id))
                                    setConfirmDeleteId(null)
                                  }}
                                  className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-xs bg-neutral-700 hover:bg-neutral-600 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(entry.id!)}
                                className="text-xs bg-red-900/60 hover:bg-red-800 text-red-300 px-2 py-1 rounded transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="w-10 h-10 mx-auto text-neutral-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-neutral-500">
              {teamFeed ? 'No team renders yet.' : 'No renders yet. Generate one above.'}
            </p>
          </div>
        )}
      </div>

      {/* Clear history confirmation overlay */}
      {confirmClearAll ? (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setConfirmClearAll(false)}>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-2">Clear all history?</h3>
            <p className="text-xs text-neutral-400 mb-5">This will permanently delete all your generated renders. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-4 py-2 text-xs rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await supabase.from('generations').delete().eq('user_id', userId)
                  setResults([])
                  setConfirmClearAll(false)
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-700 text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {compareEntry ? (
        <ComparisonModal
          generatedUrl={compareEntry.url}
          originalPreview={compareEntry.originalRenderUrl ?? preview}
          onClose={() => setCompareEntry(null)}
        />
      ) : null}
    </div>
  )
}
