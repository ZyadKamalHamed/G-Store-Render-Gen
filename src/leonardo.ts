// Leonardo API client — calls the /api/* proxy routes (Vercel serverless functions)
// to avoid CORS. The API key lives server-side as LEONARDO_API_KEY.

// Model ID — update this when switching between Nano Banana 2 and Nano Banana Pro
const MODEL_ID = 'gemini-image-2'

const WIDTH = 1584
const HEIGHT = 672
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
  if (!res.ok) throw new Error(`Step 1-2 failed: upload-render ${res.status}`)
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
  const { width = WIDTH, height = HEIGHT, mainStrength = 'HIGH', refStrength = 'LOW' } = settings
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
  if (!res.ok) throw new Error(`Step 3 failed: generate ${res.status}`)
  const data = await res.json()
  return data.generate.generationId
}

export interface GenerationResult {
  status: 'PENDING' | 'COMPLETE' | 'FAILED'
  images: string[]
}

// Step 4: Poll until complete
export async function pollGeneration(generationId: string): Promise<GenerationResult> {
  const res = await fetch(`/api/poll?id=${generationId}`)
  if (!res.ok) throw new Error(`Step 4 failed: poll ${res.status}`)
  const data = await res.json()
  const gen = data.generations_by_pk
  return {
    status: gen.status,
    images: (gen.generated_images ?? []).map((img: { url: string }) => img.url),
  }
}
