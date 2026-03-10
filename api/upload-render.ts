import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.LEONARDO_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'LEONARDO_API_KEY not set' })

  const { imageData, extension, mimeType } = req.body as {
    imageData: string
    extension: 'jpg' | 'png'
    mimeType: string
  }

  // Step 1: Get presigned S3 URL
  const initRes = await fetch('https://cloud.leonardo.ai/api/rest/v1/init-image', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ extension }),
  })
  if (!initRes.ok) return res.status(initRes.status).json({ error: 'init-image failed' })
  const initData = await initRes.json()

  const { id, url, fields: fieldsRaw } = initData.uploadInitImage
  const fields: Record<string, string> = JSON.parse(fieldsRaw)

  // Step 2: Upload to S3 (server-side — no CORS issue)
  const imageBuffer = Buffer.from(imageData, 'base64')
  const form = new FormData()
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  form.append('file', new Blob([imageBuffer], { type: mimeType }), `render.${extension}`)

  const s3Res = await fetch(url, { method: 'POST', body: form })
  if (!s3Res.ok) return res.status(s3Res.status).json({ error: `S3 upload failed: ${s3Res.status}` })

  res.status(200).json({ imageId: id })
}
