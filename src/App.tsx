import { useState } from 'react'
import TipsBanner from './components/TipsBanner'
import ToggleSection from './components/ToggleSection'
import ExtrasSelector from './components/ExtrasSelector'
import PromptPreview from './components/PromptPreview'
import ImageUpload from './components/ImageUpload'

interface ProductPlacement {
  enabled: boolean
  product: string
  location: string
  replacement: string
  refImage: string
}

interface ColourChange {
  enabled: boolean
  paletteRef: string
  targets: string
}

interface Environment {
  enabled: boolean
  whiteSpace: string
  becomes: string
  aesthetic: string
}

interface Materials {
  enabled: boolean
  roofWalls: string
  flooring: string
}

interface Extras {
  plants: boolean
  lights: boolean
  lightsColour: string
}

// Inline editable field — sizes itself to content
function Field({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const width = Math.max(value.length, placeholder.length, 6)
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="inline border-b border-neutral-600 bg-transparent text-white text-sm focus:outline-none focus:border-white placeholder-neutral-600"
      style={{ width: `${width + 1}ch` }}
    />
  )
}

function assemblePrompt(
  pp: ProductPlacement,
  cc: ColourChange,
  env: Environment,
  mat: Materials,
  lighting: string,
  extras: Extras,
): string {
  const sections: string[] = []

  sections.push(
    '## Intro\nTurn image 1 from a render to a hyper realistic, photographic image, maintaining the colours, position and objects in the space as well as the perspective exactly.',
  )

  if (pp.enabled) {
    const ref = pp.refImage ? ` similar to reference image ${pp.refImage}` : ''
    sections.push(
      `## Product Replacement\nReplace all of the ${pp.product} in/on ${pp.location} with ${pp.replacement}${ref}.`,
    )
  }

  if (cc.enabled) {
    sections.push(
      `## Colour of Products\nWithout changing the shape, size or quantity, simply change the colour of them. Apply the colours from the colour palette in ${cc.paletteRef} to ${cc.targets} but do not change the colour of anything that's already coloured — only add these colours to the white objects.`,
    )
  }

  if (env.enabled) {
    sections.push(
      `## Environment\nThe white-space ${env.whiteSpace} becomes ${env.becomes}, realistically matching the aesthetic of ${env.aesthetic}.`,
    )
  }

  if (mat.enabled) {
    sections.push(
      `## Textures/Materials\nThe roof and walls have ${mat.roofWalls}. The flooring of the interior ${mat.flooring}.`,
    )
  }

  sections.push(`## Lighting\n${lighting}`)

  if (extras.plants) {
    sections.push('## Plants\nThe plants in the shot should look more luscious and realistic.')
  }

  if (extras.lights) {
    sections.push(
      `## Lights\nAll of the lights turn on in the store giving a ${extras.lightsColour} lighting from the source.`,
    )
  }

  return sections.join('\n\n')
}

export default function App() {
  const [pp, setPp] = useState<ProductPlacement>({
    enabled: false,
    product: 'clear boxes',
    location: 'the shelves inside the store',
    replacement: 'packaged duvets, pillows, and blankets',
    refImage: '3',
  })

  const [cc, setCc] = useState<ColourChange>({
    enabled: false,
    paletteRef: 'reference image 2',
    targets: 'The white products/new products added to the shot',
  })

  const [env, setEnv] = useState<Environment>({
    enabled: false,
    whiteSpace: 'around the storefront and outside the window at the back',
    becomes: 'the interior of a lively, modern shopping mall',
    aesthetic: 'the storefront',
  })

  const [mat, setMat] = useState<Materials>({
    enabled: false,
    roofWalls: 'a textured paint look and feel, similar to reference image 4',
    flooring: 'tiled, maintaining the pattern shown in the render',
  })

  const [lighting, setLighting] = useState(
    'The scene overall should look cinematic, bright, warm and beautiful without any shadows. All of the lights turn on in the store giving a warm lighting from the source.',
  )

  const [extras, setExtras] = useState<Extras>({
    plants: false,
    lights: false,
    lightsColour: 'warm',
  })

  const assembled = assemblePrompt(pp, cc, env, mat, lighting, extras)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Render Prompt Generator</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Fill in the brief on the left — your prompt builds live on the right.
          </p>
        </div>

        <TipsBanner />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left column — form controls */}
          <div className="flex flex-col gap-3">
            <ToggleSection
              label="Product Placement"
              description="Does the render contain products that need to be replaced?"
              enabled={pp.enabled}
              onToggle={() => setPp((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <div className="text-sm text-neutral-400 leading-relaxed">
                Replace all of the{' '}
                <Field value={pp.product} onChange={(v) => setPp((s) => ({ ...s, product: v }))} placeholder="clear boxes" />
                {' '}in/on{' '}
                <Field value={pp.location} onChange={(v) => setPp((s) => ({ ...s, location: v }))} placeholder="the shelves inside the store" />
                {' '}with{' '}
                <Field value={pp.replacement} onChange={(v) => setPp((s) => ({ ...s, replacement: v }))} placeholder="packaged duvets, pillows, and blankets" />
                {' '}similar to reference image{' '}
                <Field value={pp.refImage} onChange={(v) => setPp((s) => ({ ...s, refImage: v }))} placeholder="3" />.
              </div>
            </ToggleSection>

            <ToggleSection
              label="Colour of Products"
              description="Does the product require a colour change?"
              enabled={cc.enabled}
              onToggle={() => setCc((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <div className="text-sm text-neutral-400 leading-relaxed">
                Apply the colours from the colour palette in{' '}
                <Field value={cc.paletteRef} onChange={(v) => setCc((s) => ({ ...s, paletteRef: v }))} placeholder="reference image 2" />
                {' '}to{' '}
                <Field value={cc.targets} onChange={(v) => setCc((s) => ({ ...s, targets: v }))} placeholder="The white products" />.
              </div>
            </ToggleSection>

            <ToggleSection
              label="Environment"
              description="Is there blank space in the render you want to fill?"
              enabled={env.enabled}
              onToggle={() => setEnv((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <div className="text-sm text-neutral-400 leading-relaxed">
                The white-space{' '}
                <Field value={env.whiteSpace} onChange={(v) => setEnv((s) => ({ ...s, whiteSpace: v }))} placeholder="around the storefront" />
                {' '}becomes{' '}
                <Field value={env.becomes} onChange={(v) => setEnv((s) => ({ ...s, becomes: v }))} placeholder="the interior of a lively, modern shopping mall" />
                , realistically matching the aesthetic of{' '}
                <Field value={env.aesthetic} onChange={(v) => setEnv((s) => ({ ...s, aesthetic: v }))} placeholder="the storefront" />.
              </div>
            </ToggleSection>

            <ToggleSection
              label="Textures / Materials"
              description="Specify surfaces and finishes? (recommended off for first try)"
              enabled={mat.enabled}
              onToggle={() => setMat((s) => ({ ...s, enabled: !s.enabled }))}
            >
              <div className="text-sm text-neutral-400 leading-relaxed space-y-2">
                <p>
                  The roof and walls have{' '}
                  <Field value={mat.roofWalls} onChange={(v) => setMat((s) => ({ ...s, roofWalls: v }))} placeholder="a textured paint look and feel" />.
                </p>
                <p>
                  The flooring of the interior{' '}
                  <Field value={mat.flooring} onChange={(v) => setMat((s) => ({ ...s, flooring: v }))} placeholder="is tiled maintaining the pattern shown" />.
                </p>
              </div>
            </ToggleSection>

            {/* Lighting — always included, always editable */}
            <div className="border border-neutral-800 rounded-lg px-4 py-3">
              <p className="text-sm font-medium text-neutral-200 mb-2">Lighting</p>
              <textarea
                value={lighting}
                onChange={(e) => setLighting(e.target.value)}
                rows={3}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-neutral-500 leading-relaxed"
              />
            </div>

            <ExtrasSelector
              plants={extras.plants}
              lights={extras.lights}
              lightsColour={extras.lightsColour}
              onChange={(plants, lights, lightsColour) => setExtras({ plants, lights, lightsColour })}
            />

            <ImageUpload />
          </div>

          {/* Right column — live prompt preview */}
          <div className="lg:sticky lg:top-10">
            <PromptPreview assembled={assembled} />
          </div>
        </div>
      </div>
    </div>
  )
}
