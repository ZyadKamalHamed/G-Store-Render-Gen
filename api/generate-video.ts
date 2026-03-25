import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const apiKey = process.env.LEONARDO_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'LEONARDO_API_KEY not set' })

  const { model, imageId, prompt, duration, width, height, resolution } = req.body

  let url: string
  let body: unknown

  if (model === 'VEO3_1') {
    url = 'https://cloud.leonardo.ai/api/rest/v1/generations-image-to-video'
    body = {
      prompt,
      imageId,
      imageType: 'UPLOADED',
      resolution: resolution || 'RESOLUTION_1080',
      duration: duration || 8,
      height: height || 1080,
      width: width || 1920,
      model: 'VEO3_1',
      isPublic: false,
    }
  } else {
    url = 'https://cloud.leonardo.ai/api/rest/v2/generations'
    body = {
      model: 'kling-3.0',
      public: false,
      parameters: {
        prompt,
        duration: duration || 5,
        width: width || 1920,
        height: height || 1080,
        mode: resolution || 'RESOLUTION_1080',
        motion_has_audio: false,
        guidances: {
          start_frame: [{ image: { id: imageId, type: 'UPLOADED' } }],
        },
      },
    }
  }

  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await upstream.json()
  res.status(upstream.status).json(data)
}
