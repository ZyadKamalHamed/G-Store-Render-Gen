import type { VercelRequest, VercelResponse } from '@vercel/node'

const DATABASE_ID = '73e75188f87b46e48d822336ef1bb33d'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) return res.status(500).json({ error: 'NOTION_API_KEY not set' })

  const { suggestion } = req.body as { suggestion: string }
  if (!suggestion?.trim()) return res.status(400).json({ error: 'suggestion is required' })

  const upstream = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: {
        Suggestion: { title: [{ text: { content: suggestion.trim() } }] },
        Status: { select: { name: 'New' } },
      },
    }),
  })

  if (!upstream.ok) {
    const err = await upstream.json()
    return res.status(upstream.status).json({ error: err.message ?? 'Notion error' })
  }

  res.status(200).json({ ok: true })
}
