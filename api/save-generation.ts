import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' })
  }

  const { user_id, user_email, prompt, image_urls, settings, created_at, original_image_b64, original_image_ext, original_image_mime } = req.body as {
    user_id: string
    user_email: string
    prompt: string
    image_urls: string[]
    settings: Record<string, unknown>
    created_at: string
    original_image_b64?: string
    original_image_ext?: string
    original_image_mime?: string
  }

  if (!user_id || !image_urls?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

  // Upload original render server-side (bypasses storage RLS)
  let original_render_url: string | null = null
  if (original_image_b64 && original_image_ext && original_image_mime) {
    const buffer = Buffer.from(original_image_b64, 'base64')
    const path = `${user_id}/${Date.now()}.${original_image_ext}`
    const { error: uploadErr } = await supabase.storage
      .from('Originals')
      .upload(path, buffer, { contentType: original_image_mime, upsert: true })
    if (!uploadErr) {
      original_render_url = supabase.storage.from('Originals').getPublicUrl(path).data.publicUrl
    }
  }

  const { data, error } = await supabase
    .from('generations')
    .insert({ user_id, user_email, prompt, image_urls, settings, created_at, original_render_url })
    .select('id')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  res.status(200).json({ id: data.id, original_render_url })
}
