export type ImageModelId = 'gemini-image-2' | 'nano-banana-2' | 'gpt-image-2'

export type ReferenceStrength = 'LOW' | 'MID' | 'HIGH'

export type ImageQuality = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DimensionOption {
  label: string
  width: number
  height: number
  tier: 'Fast' | 'Quality' | 'Large'
}

export interface StyleOption {
  id: string | null
  label: string
}

export interface ModelProfile {
  id: ImageModelId
  label: string
  description: string
  supportsReferenceStrength: boolean
  supportsQuality: boolean
  dimensions: DimensionOption[]
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: null, label: 'No style preset' },
  { id: '556c1ee5-ec38-42e8-955a-1e82dad0ffa1', label: 'Leonardo None' },
  { id: '7c3f932b-a572-47cb-9b9b-f20211e63b5b', label: 'Pro Color Photography' },
  { id: '5bdc3f2a-1be6-4d1c-8e77-992a30824a2c', label: 'Stock Photo' },
  { id: '581ba6d6-5aac-4492-bebe-54c424a0d46e', label: 'Pro Film Photography' },
]

const nanoDimensions: DimensionOption[] = [
  { label: '21:9 1K', width: 1584, height: 672, tier: 'Fast' },
  { label: '21:9 2K', width: 3168, height: 1344, tier: 'Quality' },
  { label: '21:9 4K', width: 6336, height: 2688, tier: 'Large' },
  { label: '16:9 1K', width: 1376, height: 768, tier: 'Fast' },
  { label: '16:9 2K', width: 2752, height: 1536, tier: 'Quality' },
  { label: '16:9 4K', width: 5504, height: 3072, tier: 'Large' },
  { label: '3:2 1K', width: 1264, height: 848, tier: 'Fast' },
  { label: '3:2 2K', width: 2528, height: 1696, tier: 'Quality' },
  { label: '4:3 1K', width: 1200, height: 896, tier: 'Fast' },
  { label: '4:3 2K', width: 2400, height: 1792, tier: 'Quality' },
  { label: '1:1 1K', width: 1024, height: 1024, tier: 'Fast' },
  { label: '1:1 2K', width: 2048, height: 2048, tier: 'Quality' },
  { label: '9:16 1K', width: 768, height: 1376, tier: 'Fast' },
  { label: '9:16 2K', width: 1536, height: 2752, tier: 'Quality' },
]

const gptImageDimensions: DimensionOption[] = [
  { label: '21:9 wide', width: 1584, height: 672, tier: 'Fast' },
  { label: '21:9 large', width: 3168, height: 1344, tier: 'Quality' },
  { label: '16:9', width: 1376, height: 768, tier: 'Fast' },
  { label: '16:9 large', width: 2752, height: 1536, tier: 'Quality' },
  { label: '3:2', width: 1264, height: 848, tier: 'Fast' },
  { label: '3:2 large', width: 2528, height: 1696, tier: 'Quality' },
  { label: '1:1', width: 1024, height: 1024, tier: 'Fast' },
  { label: '1:1 large', width: 2048, height: 2048, tier: 'Quality' },
  { label: '9:16', width: 768, height: 1376, tier: 'Fast' },
  { label: '9:16 large', width: 1536, height: 2752, tier: 'Quality' },
]

export const MODEL_PROFILES: ModelProfile[] = [
  {
    id: 'gemini-image-2',
    label: 'Nano Banana Pro',
    description: 'Best default for final render-to-photo output, long prompts, and high-fidelity edits.',
    supportsReferenceStrength: true,
    supportsQuality: false,
    dimensions: nanoDimensions,
  },
  {
    id: 'nano-banana-2',
    label: 'Nano Banana 2',
    description: 'Faster iteration model for testing preservation, materials, and lighting before a final Pro run.',
    supportsReferenceStrength: true,
    supportsQuality: false,
    dimensions: nanoDimensions,
  },
  {
    id: 'gpt-image-2',
    label: 'GPT Image 2',
    description: 'Advanced Leonardo option for strong prompt adherence and architecture-aware editing.',
    supportsReferenceStrength: false,
    supportsQuality: true,
    dimensions: gptImageDimensions,
  },
]

export function getModelProfile(id: ImageModelId): ModelProfile {
  return MODEL_PROFILES.find((profile) => profile.id === id) ?? MODEL_PROFILES[0]
}

export function isValidDimension(model: ImageModelId, width: number, height: number): boolean {
  const profile = getModelProfile(model)
  return profile.dimensions.some((option) => option.width === width && option.height === height)
}
