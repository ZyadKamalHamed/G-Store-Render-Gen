import { describe, expect, it } from 'vitest'
import { getPromptPlatform, isOverPromptLimit } from './platformProfiles'

describe('prompt platform limits', () => {
  it('enforces Leonardo at 1500 chars only for Leonardo', () => {
    const prompt = 'x'.repeat(1600)

    expect(isOverPromptLimit(prompt, getPromptPlatform('leonardo'))).toBe(true)
    expect(isOverPromptLimit(prompt, getPromptPlatform('gemini'))).toBe(false)
    expect(isOverPromptLimit(prompt, getPromptPlatform('gpt-image'))).toBe(false)
    expect(isOverPromptLimit(prompt, getPromptPlatform('manual'))).toBe(false)
  })
})
