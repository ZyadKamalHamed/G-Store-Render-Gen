import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

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
  const gen = data.generations_by_pk

  // Only re-host when complete and Supabase is configured
  if (
    gen.status !== 'COMPLETE' ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_KEY
  ) {
    return res.status(200).json(data)
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  const rehostedImages = await Promise.all(
    (gen.generated_images ?? []).map(async (img: { url: string }, i: number) => {
      try {
        const imageRes = await fetch(img.url)
        if (!imageRes.ok) return img
        const buffer = await imageRes.arrayBuffer()
        const path = `${id}/${i}.jpg`
        const { error: uploadError } = await supabase.storage.from('Renders').upload(path, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        })
        if (uploadError) return img
        const { data: urlData } = supabase.storage.from('Renders').getPublicUrl(path)
        return { ...img, url: urlData.publicUrl }
      } catch {
        return img // fall back to Leonardo URL if re-hosting fails
      }
    })
  )

  return res.status(200).json({
    ...data,
    generations_by_pk: { ...gen, generated_images: rehostedImages },
  })
}
