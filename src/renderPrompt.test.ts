import { describe, expect, it } from 'vitest'
import { assembleRenderPrompt, defaultRenderBrief, referenceRoleCopy, type RenderBrief } from './renderPrompt'
import { getPromptPlatform, isOverPromptLimit } from './platformProfiles'

describe('assembleRenderPrompt', () => {
  it('front-loads image-to-image preservation before creative treatment', () => {
    const prompt = assembleRenderPrompt(defaultRenderBrief)

    expect(prompt).toContain('IMG2IMG')
    expect(prompt).toContain('source of truth')
    expect(prompt).toContain('Preserve:')
    expect(prompt.indexOf('Preserve:')).toBeLessThan(prompt.indexOf('Materials:'))
    expect(prompt.indexOf('Change budget:')).toBeLessThan(prompt.indexOf('Light:'))
  })

  it('keeps the default prompt inside Leonardo character limits', () => {
    const prompt = assembleRenderPrompt(defaultRenderBrief)

    expect(isOverPromptLimit(prompt, getPromptPlatform('leonardo'))).toBe(false)
  })

  it('defaults to brighter retail lighting language', () => {
    const prompt = assembleRenderPrompt(defaultRenderBrief)

    expect(prompt).toContain('Bright premium retail photography')
    expect(prompt).toContain('no dull grey cast')
  })

  it('isolates targeted product replacement from fixed geometry', () => {
    const brief: RenderBrief = {
      ...defaultRenderBrief,
      productSwap: {
        enabled: true,
        target: 'clear display boxes',
        location: 'the left wall shelf bay',
        replacement: 'folded linen bedding packs',
        referenceLabel: 'reference image 2',
      },
    }

    const prompt = assembleRenderPrompt(brief)

    expect(prompt).toContain('replace clear display boxes in/on the left wall shelf bay with folded linen bedding packs')
    expect(prompt).toContain('Keep shelf layout, count, spacing, perspective, surroundings')
    expect(prompt).toContain('No moved architecture')
  })

  it('adds reference role instructions without letting references override the layout', () => {
    const copy = referenceRoleCopy({
      role: 'material-sample',
      label: 'reference image 3',
      notes: 'Oak should read as satin, not glossy.',
    })

    expect(copy).toContain('material only')
    expect(copy).toContain('do not copy layout')
    expect(copy).toContain('Oak should read as satin, not glossy.')
  })

  it('includes people and mirror instructions only when enabled', () => {
    const basePrompt = assembleRenderPrompt(defaultRenderBrief)
    const prompt = assembleRenderPrompt({
      ...defaultRenderBrief,
      people: {
        enabled: true,
        mode: 'motion-blur',
        placement: 'two shoppers beyond the storefront',
        description: 'anonymous figures walking through the mall',
      },
      mirrorGlassNotes: {
        enabled: true,
        value: 'The rear glass should reflect the mall corridor and warm shop lighting.',
      },
    })

    expect(basePrompt).not.toContain('People:')
    expect(prompt).toContain('long-exposure staffage')
    expect(prompt).toContain('The rear glass should reflect the mall corridor')
  })
})
