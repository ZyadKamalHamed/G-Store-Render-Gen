// Leonardo API client — calls the /api/* proxy routes (Vercel serverless functions)
// to avoid CORS. The API key lives server-side as LEONARDO_API_KEY.

// Model ID — update this when switching between Nano Banana 2 and Nano Banana Pro
const MODEL_ID = 'gemini-image-2'

const STYLE_ID = '111dc692-d470-4eec-b791-3475abac4c46'

// Steps 1+2: Init image + S3 upload (combined server-side to avoid S3 CORS)
export async function uploadRender(file: File): Promise<string> {
  const extension = file.type === 'image/png' ? 'png' : 'jpg'
  const imageData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1]) // strip data URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  let res: Response
  try {
    res = await fetch('/api/upload-render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageData, extension, mimeType: file.type }),
    })
  } catch {
    throw new Error('Step 1-2 failed: could not reach /api/upload-render')
  }
  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Upload failed (${res.status})`
    throw new Error(msg)
  }
  const data = await res.json()
  return data.imageId
}

export interface GenerateSettings {
  width?: number
  height?: number
  mainStrength?: string
  refStrength?: string
}

// Step 3: Trigger generation
export async function generate(
  mainImageId: string,
  refImageIds: string[],
  prompt: string,
  quantity: number,
  settings: GenerateSettings = {},
): Promise<string> {
  const { width = 1584, height = 672, mainStrength = 'HIGH', refStrength = 'LOW' } = settings
  const imageReferences = [
    { image: { id: mainImageId, type: 'UPLOADED' }, strength: mainStrength },
    ...refImageIds.map((id) => ({ image: { id, type: 'UPLOADED' }, strength: refStrength })),
  ]
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_ID,
      parameters: {
        width,
        height,
        prompt,
        quantity,
        seed: Math.floor(Math.random() * 2147483647),
        guidances: {
          image_reference: imageReferences,
        },
        style_ids: [STYLE_ID],
        prompt_enhance: 'OFF',
      },
      public: false,
    }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Generate failed (${res.status})`
    throw new Error(msg)
  }
  const data = await res.json()
  return data.generate.generationId
}

// Video generation — routes to Veo 3.1 or Kling 3.0 via /api/generate-video
export async function generateVideo(
  model: 'VEO3_1' | 'kling-3.0',
  imageId: string,
  prompt: string,
  duration: number,
  width: number,
  height: number,
): Promise<string> {
  const res = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, imageId, prompt, duration, width, height }),
  })
  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Video generate failed (${res.status})`
    throw new Error(msg)
  }
  const data = await res.json()
  // Veo returns { sdGenerationJob: { generationId } }, Kling returns { generate: { generationId } }
  return data.sdGenerationJob?.generationId ?? data.generate?.generationId
}

export interface VideoResult {
  status: 'PENDING' | 'COMPLETE' | 'FAILED'
  videos: string[]
}

export async function pollVideo(generationId: string): Promise<VideoResult> {
  const res = await fetch(`/api/poll-video?id=${generationId}`)
  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Poll failed (${res.status})`
    throw new Error(msg)
  }
  const data = await res.json()
  const gen = data.generations_by_pk
  return {
    status: gen.status,
    videos: (gen.generated_images ?? []).map((img: { url: string }) => img.url),
  }
}

export interface GenerationResult {
  status: 'PENDING' | 'COMPLETE' | 'FAILED'
  images: string[]
}

// Step 4: Poll until complete
export async function pollGeneration(generationId: string): Promise<GenerationResult> {
  const res = await fetch(`/api/poll?id=${generationId}`)
  if (!res.ok) {
    const errData = await res.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Poll failed (${res.status})`
    throw new Error(msg)
  }
  const data = await res.json()
  const gen = data.generations_by_pk
  return {
    status: gen.status,
    images: (gen.generated_images ?? []).map((img: { url: string }) => img.url),
  }
}
