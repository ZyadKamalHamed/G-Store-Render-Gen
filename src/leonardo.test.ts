import { describe, expect, it } from 'vitest'
import { createGenerationBody } from './leonardo'

function parameters(body: ReturnType<typeof createGenerationBody>) {
  return body.parameters as {
    width: number
    height: number
    prompt_enhance: string
    quality?: string
    style_ids?: string[]
    guidances: {
      image_reference: Array<{ strength?: string; image: { id: string; type: string } }>
    }
  }
}

describe('createGenerationBody', () => {
  it('keeps Nano Banana Pro image references strength-aware', () => {
    const body = createGenerationBody('main', ['material'], 'prompt', 1, {
      model: 'gemini-image-2',
      width: 1584,
      height: 672,
      mainStrength: 'HIGH',
      refStrength: 'LOW',
      styleId: 'style-id',
      seed: 123,
    })
    const params = parameters(body)

    expect(body.model).toBe('gemini-image-2')
    expect(params.prompt_enhance).toBe('OFF')
    expect(params.guidances.image_reference).toEqual([
      { image: { id: 'main', type: 'UPLOADED' }, strength: 'HIGH' },
      { image: { id: 'material', type: 'UPLOADED' }, strength: 'LOW' },
    ])
    expect(params.style_ids).toEqual(['style-id'])
  })

  it('omits reference strengths and style presets for GPT Image 2', () => {
    const body = createGenerationBody('main', ['palette'], 'prompt', 1, {
      model: 'gpt-image-2',
      width: 1376,
      height: 768,
      quality: 'HIGH',
      styleId: 'should-not-send',
      seed: 456,
    })
    const params = parameters(body)

    expect(body.model).toBe('gpt-image-2')
    expect(params.quality).toBe('HIGH')
    expect(params.style_ids).toBeUndefined()
    expect(params.guidances.image_reference).toEqual([
      { image: { id: 'main', type: 'UPLOADED' } },
      { image: { id: 'palette', type: 'UPLOADED' } },
    ])
  })

  it('rejects dimensions outside the model profile', () => {
    expect(() =>
      createGenerationBody('main', [], 'prompt', 1, {
        model: 'nano-banana-2',
        width: 1216,
        height: 816,
      }),
    ).toThrow('Nano Banana 2 does not support 1216 x 816')
  })
})
