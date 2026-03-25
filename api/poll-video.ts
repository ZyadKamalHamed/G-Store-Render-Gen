import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const apiKey = process.env.LEONARDO_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'LEONARDO_API_KEY not set' })

  const { id } = req.query
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'Missing id' })

  const upstream = await fetch(`https://cloud.leonardo.ai/api/rest/v1/generations/${id}`, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
  })

  if (!upstream.ok) {
    const errData = await upstream.json().catch(() => null)
    const msg = errData?.error?.message ?? errData?.detail ?? errData?.message ?? `Poll failed (${upstream.status})`
    return res.status(upstream.status).json({ error: msg })
  }

  const data = await upstream.json()
  res.status(200).json(data)
}
