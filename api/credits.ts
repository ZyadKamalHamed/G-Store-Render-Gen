import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiKey = process.env.LEONARDO_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'LEONARDO_API_KEY not set' })

  const upstream = await fetch('https://cloud.leonardo.ai/api/rest/v1/me', {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  })

  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: 'Failed to fetch credit info' })
  }

  const data = await upstream.json()
  res.status(200).json(data)
}
