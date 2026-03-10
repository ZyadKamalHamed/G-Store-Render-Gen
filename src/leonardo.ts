// Leonardo API client
// Model ID — update this when switching between Nano Banana 2 and Nano Banana Pro
const MODEL_ID = 'nano-banana-2'

const WIDTH = 1584
const HEIGHT = 672
const STYLE_ID = '111dc692-d470-4eec-b791-3475abac4c46'

function getApiKey(): string {
  const key = import.meta.env.VITE_LEONARDO_API_KEY
  if (!key) throw new Error('VITE_LEONARDO_API_KEY is not set')
  return key
}

function authHeaders() {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    authorization: `Bearer ${getApiKey()}`,
  }
}

// Step 1: Get presigned S3 upload URL
export async function initImage(extension: 'jpg' | 'png' = 'jpg'): Promise<{ id: string; url: string; fields: Record<string, string> }> {
  const res = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ extension }),
  })
  if (!res.ok) throw new Error(`init-image failed: ${res.status}`)
  const data = await res.json()
  return {
    id: data.uploadInitImage.id,
    url: data.uploadInitImage.url,
    fields: JSON.parse(data.uploadInitImage.fields),
  }
}

// Step 2: Upload image to S3 presigned URL (no auth header)
export async function uploadImage(url: string, fields: Record<string, string>, file: File): Promise<void> {
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('file', file)
  const res = await fetch(url, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`)
}

// Step 3: Trigger generation
export async function generate(imageId: string, prompt: string, quantity: number): Promise<string> {
  const res = await fetch('https://cloud.leonardo.ai/api/rest/v2/generations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: MODEL_ID,
      parameters: {
        width: WIDTH,
        height: HEIGHT,
        prompt,
        quantity,
        seed: Math.floor(Math.random() * 2147483647),
        guidances: {
          image_reference: [
            { image: { id: imageId, type: 'UPLOADED' }, strength: 'MID' },
          ],
        },
        style_ids: [STYLE_ID],
        prompt_enhance: 'OFF',
      },
      public: false,
    }),
  })
  if (!res.ok) throw new Error(`generate failed: ${res.status}`)
  const data = await res.json()
  return data.generate.generationId
}

export interface GenerationResult {
  status: 'PENDING' | 'COMPLETE' | 'FAILED'
  images: string[]
}

// Step 4: Poll until complete
export async function pollGeneration(generationId: string): Promise<GenerationResult> {
  const res = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(`poll failed: ${res.status}`)
  const data = await res.json()
  const gen = data.generations_by_pk
  return {
    status: gen.status,
    images: (gen.generated_images ?? []).map((img: { url: string }) => img.url),
  }
}
