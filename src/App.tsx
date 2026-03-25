import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import TipsBanner from './components/TipsBanner'
import ToggleSection from './components/ToggleSection'
import ExtrasSelector from './components/ExtrasSelector'
import PromptPreview from './components/PromptPreview'
import ImageGenSection from './components/ImageGenSection'
import VideoTab from './components/VideoTab'
import SuggestionBox from './components/SuggestionBox'
import AuthGuard from './components/AuthGuard'
import ProfileMenu from './components/ProfileMenu'
import { stripHeadings } from './utils/stripHeadings'
import { activeClass } from './utils/activeClass'

type AppTab = 'prompt' | 'image' | 'video'

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

const INTRO_SECTION =
  '## Intro\nTurn image 1 from a render to a hyper realistic, photographic image, maintaining the colours, position and objects in the space as well as the perspective exactly.'

function productSection(pp: ProductPlacement): string {
  const ref = pp.refImage ? ` similar to reference image ${pp.refImage}` : ''
  return `## Product Replacement\nReplace all of the ${pp.product} in/on ${pp.location} with ${pp.replacement}${ref}.`
}

function colourSection(cc: ColourChange): string {
  return `## Colour of Products\nWithout changing the shape, size or quantity, simply change the colour of them. Apply the colours from the colour palette in ${cc.paletteRef} to ${cc.targets} but do not change the colour of anything that's already coloured — only add these colours to the white objects.`
}

function environmentSection(env: Environment): string {
  return `## Environment\nThe white-space ${env.whiteSpace} becomes ${env.becomes}, realistically matching the aesthetic of ${env.aesthetic}.`
}

function materialsSection(mat: Materials): string {
  return `## Textures/Materials\nThe roof and walls have ${mat.roofWalls}. The flooring of the interior ${mat.flooring}.`
}

function lightsSection(colour: string): string {
  return `## Lights\nAll of the lights turn on in the store giving a ${colour} lighting from the source.`
}

function assemblePrompt(
  pp: ProductPlacement,
  cc: ColourChange,
  env: Environment,
  mat: Materials,
  lighting: string,
  extras: Extras,
): string {
  const sections: string[] = [INTRO_SECTION]
  if (pp.enabled) sections.push(productSection(pp))
  if (cc.enabled) sections.push(colourSection(cc))
  if (env.enabled) sections.push(environmentSection(env))
  if (mat.enabled) sections.push(materialsSection(mat))
  sections.push(`## Lighting\n${lighting}`)
  if (extras.plants) sections.push('## Plants\nThe plants in the shot should look more luscious and realistic.')
  if (extras.lights) sections.push(lightsSection(extras.lightsColour))
  return sections.join('\n\n')
}

function AppInner({ user }: { user: User }) {
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

  const [activeTab, setActiveTab] = useState<AppTab>('prompt')
  const [apiTokens, setApiTokens] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/credits')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const details = data?.user_details?.[0]
        if (details) {
          const tokens = (details.apiPaidTokens ?? 0) + (details.apiSubscriptionTokens ?? 0)
          setApiTokens(tokens)
        }
      })
      .catch(() => {})
  }, [])

  const assembled = assemblePrompt(pp, cc, env, mat, lighting, extras)
  const copyText = stripHeadings(assembled)

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">G-store Render Box</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Fill in the brief on the left — your prompt builds live on the right.
            </p>
          </div>
          <div className="shrink-0 pt-1 flex items-center gap-3">
            {apiTokens !== null ? (
              <span className="text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1">
                {apiTokens.toLocaleString()} tokens
              </span>
            ) : null}
            <ProfileMenu user={user} />
          </div>
        </div>

        <TipsBanner />

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 w-fit mb-8">
          {([['prompt', 'Prompt Generator'], ['image', 'Image'], ['video', 'Video']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${activeClass(activeTab === key)}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Prompt Generator tab */}
        {activeTab === 'prompt' ? (
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

            </div>

            {/* Right column — live prompt preview */}
            <div className="lg:sticky lg:top-10">
              <PromptPreview assembled={assembled} copyText={copyText} />
            </div>
          </div>
        ) : null}

        {/* Image tab */}
        {activeTab === 'image' ? (
          <ImageGenSection copyText={copyText} user={user} />
        ) : null}

        {/* Video tab */}
        {activeTab === 'video' ? (
          <VideoTab user={user} />
        ) : null}

        <SuggestionBox />
      </div>
    </div>
  )
}

export default function App() {
  return <AuthGuard>{(user) => <AppInner user={user} />}</AuthGuard>
}
