import { GoogleGenerativeAI } from '@google/generative-ai'

export type ModelId = 'nano-banana-2' | 'nano-banana-pro'

export const MODELS: Record<ModelId, { label: string; promptHint: string }> = {
  'nano-banana-2': { label: 'Nano Banana 2 — Fast', promptHint: 'Nano Banana 2 (concise, under 120 words)' },
  'nano-banana-pro': { label: 'Nano Banana Pro — Quality', promptHint: 'Nano Banana Pro (rich, up to 150 words)' },
}

export interface PromptFields {
  roomType: string
  style: string
  materials: string
  lighting: string
  mood: string
  extras: string
}

const SYSTEM_PROMPT = `You are an expert at writing image generation prompts for interior and architectural visualisation.
Transform the user's brief into a single, optimised prompt using descriptive prose — never keyword lists or comma-separated tags.

Structure every prompt in this order:
1. Photographic style (e.g. "Editorial architectural photography")
2. Subject and setting (room type, layout, key furniture)
3. Specific material names (e.g. "honed Calacatta marble", "oiled American white oak", "brushed bronze hardware")
4. Lighting quality and direction (e.g. "soft north-facing diffused daylight", "warm incandescent wash from recessed coves")
5. Camera spec (focal length, e.g. "shot on a 24mm tilt-shift lens")
6. Mood and atmosphere
7. Lived-in details that make the space feel real

Rules:
- Write in flowing prose, not fragments
- Use specific, evocative material and finish names — never generic words like "wood" or "stone"
- No mention of AI, rendering, or CGI — write as if describing a real photograph
- For Nano Banana Pro: up to 150 words, richer and more poetic language
- For Nano Banana 2: under 120 words, precise and clear over poetic`

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY)
const gemini = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview', systemInstruction: SYSTEM_PROMPT })

export async function generatePrompt(fields: PromptFields, model: ModelId): Promise<string> {
  const userMessage = `Generate a prompt optimised for ${MODELS[model].promptHint}.

Room type: ${fields.roomType}
Style: ${fields.style}
Key materials and finishes: ${fields.materials}
Lighting: ${fields.lighting}
Mood: ${fields.mood}
Additional details: ${fields.extras || 'none'}`

  const result = await gemini.generateContent(userMessage)
  return result.response.text()
}
