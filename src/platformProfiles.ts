export type PromptPlatformId = 'leonardo' | 'gemini' | 'gpt-image' | 'manual'

export interface PromptPlatform {
  id: PromptPlatformId
  label: string
  promptLimit: number | null
  description: string
}

export const PROMPT_PLATFORMS: PromptPlatform[] = [
  {
    id: 'leonardo',
    label: 'Leonardo',
    promptLimit: 1500,
    description: 'Leonardo prompt limit. Generation is blocked over 1500 characters.',
  },
  {
    id: 'gemini',
    label: 'Nano Banana direct / Gemini',
    promptLimit: 6000,
    description: 'Roomier prompt budget for direct Gemini/Nano Banana workflows.',
  },
  {
    id: 'gpt-image',
    label: 'GPT Image',
    promptLimit: 4000,
    description: 'Useful for pasting into GPT Image workflows with a larger instruction budget.',
  },
  {
    id: 'manual',
    label: 'Manual / other',
    promptLimit: null,
    description: 'No enforced character limit. Use when pasting into another tool.',
  },
]

export function getPromptPlatform(id: PromptPlatformId): PromptPlatform {
  return PROMPT_PLATFORMS.find((platform) => platform.id === id) ?? PROMPT_PLATFORMS[0]
}

export function isOverPromptLimit(text: string, platform: PromptPlatform): boolean {
  return platform.promptLimit !== null && text.length > platform.promptLimit
}
