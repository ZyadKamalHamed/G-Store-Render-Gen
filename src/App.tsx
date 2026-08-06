import { useState } from 'react'
import TipsBanner from './components/TipsBanner'
import ToggleSection from './components/ToggleSection'
import ExtrasSelector from './components/ExtrasSelector'
import PromptPreview from './components/PromptPreview'
import SuggestionBox from './components/SuggestionBox'
import { activeClass } from './utils/activeClass'
import { stripHeadings } from './utils/stripHeadings'
import { LIGHTING_PRESETS } from './lightingPresets'
import {
  assembleRenderPrompt,
  defaultRenderBrief,
  type PeopleMode,
  type RealismPass,
  type RenderBrief,
  type SourceRenderType,
} from './renderPrompt'
import { PROMPT_PLATFORMS, type PromptPlatformId } from './platformProfiles'

type AppTab = 'prompt-v2' | 'prompt-v1' | 'image' | 'video'

interface ProductPlacement {
  enabled: boolean
  product: string
  location: string
  replacement: string
  refImage: string
}

interface LegacyColourChange {
  enabled: boolean
  paletteRef: string
  targets: string
}

interface LegacyEnvironment {
  enabled: boolean
  whiteSpace: string
  becomes: string
  aesthetic: string
}

interface LegacyMaterials {
  enabled: boolean
  roofWalls: string
  flooring: string
}

interface Extras {
  plants: boolean
  lights: boolean
  lightsColour: string
}

const sourceTypes: SourceRenderType[] = ['Vectorworks render', 'SketchUp render', '3D render', 'CAD viewport', 'finished flat render']
const realismPasses: { value: RealismPass; label: string }[] = [
  { value: 'photographic', label: 'Photo pass' },
  { value: 'material-upgrade', label: 'Materials' },
  { value: 'lighting-upgrade', label: 'Lighting' },
  { value: 'client-presentation', label: 'Client-ready' },
]
const peopleModes: { value: PeopleMode; label: string }[] = [
  { value: 'background', label: 'Background' },
  { value: 'sharp', label: 'Sharp' },
  { value: 'motion-blur', label: 'Motion blur' },
]

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
      />
    </label>
  )
}

function TextField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white resize-none leading-relaxed placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
      />
    </label>
  )
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (v: T) => void
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-neutral-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function BlockedFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="relative flex items-center justify-center py-24">
      <div className="text-center">
        <p className="text-lg font-semibold text-neutral-400">{title}</p>
        <p className="text-sm text-neutral-600 mt-1">{description}</p>
      </div>
    </div>
  )
}

function InlineField({
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

const LEGACY_INTRO =
  '## Intro\nTurn image 1 from a render to a hyper realistic, photographic image, maintaining the colours, position and objects in the space as well as the perspective exactly.'

function legacyProductSection(pp: ProductPlacement): string {
  const ref = pp.refImage ? ` similar to reference image ${pp.refImage}` : ''
  return `## Product Replacement\nReplace all of the ${pp.product} in/on ${pp.location} with ${pp.replacement}${ref}.`
}

function legacyColourSection(cc: LegacyColourChange): string {
  return `## Colour of Products\nWithout changing the shape, size or quantity, simply change the colour of them. Apply the colours from the colour palette in ${cc.paletteRef} to ${cc.targets} but do not change the colour of anything that's already coloured, only add these colours to the white objects.`
}

function legacyEnvironmentSection(env: LegacyEnvironment): string {
  return `## Environment\nThe white-space ${env.whiteSpace} becomes ${env.becomes}, realistically matching the aesthetic of ${env.aesthetic}.`
}

function legacyMaterialsSection(mat: LegacyMaterials): string {
  return `## Textures/Materials\nThe roof and walls have ${mat.roofWalls}. The flooring of the interior ${mat.flooring}.`
}

function legacyLightsSection(colour: string): string {
  return `## Lights\nAll of the lights turn on in the store giving a ${colour} lighting from the source.`
}

function assembleLegacyPrompt(
  pp: ProductPlacement,
  cc: LegacyColourChange,
  env: LegacyEnvironment,
  mat: LegacyMaterials,
  lighting: string,
  extras: Extras,
): string {
  const sections: string[] = [LEGACY_INTRO]
  if (pp.enabled) sections.push(legacyProductSection(pp))
  if (cc.enabled) sections.push(legacyColourSection(cc))
  if (env.enabled) sections.push(legacyEnvironmentSection(env))
  if (mat.enabled) sections.push(legacyMaterialsSection(mat))
  sections.push(`## Lighting\n${lighting}`)
  if (extras.plants) sections.push('## Plants\nThe plants in the shot should look more luscious and realistic.')
  if (extras.lights) sections.push(legacyLightsSection(extras.lightsColour))
  return sections.join('\n\n')
}

function AppInner() {
  const [activeTab, setActiveTab] = useState<AppTab>('prompt-v1')
  const [brief, setBrief] = useState<RenderBrief>(defaultRenderBrief)
  const [platformId, setPlatformId] = useState<PromptPlatformId>('leonardo')
  const [pp, setPp] = useState<ProductPlacement>({
    enabled: false,
    product: 'clear boxes',
    location: 'the shelves inside the store',
    replacement: 'packaged duvets, pillows, and blankets',
    refImage: '3',
  })
  const [cc, setCc] = useState<LegacyColourChange>({
    enabled: false,
    paletteRef: 'reference image 2',
    targets: 'The white products/new products added to the shot',
  })
  const [env, setEnv] = useState<LegacyEnvironment>({
    enabled: false,
    whiteSpace: 'around the storefront and outside the window at the back',
    becomes: 'the interior of a lively, modern shopping mall',
    aesthetic: 'the storefront',
  })
  const [mat, setMat] = useState<LegacyMaterials>({
    enabled: false,
    roofWalls: 'a textured paint look and feel, similar to reference image 4',
    flooring: 'tiled, maintaining the pattern shown in the render',
  })
  const [legacyLighting, setLegacyLighting] = useState(
    'The scene overall should look cinematic, bright, warm and beautiful without any shadows. All of the lights turn on in the store giving a warm lighting from the source.',
  )
  const [extras, setExtras] = useState<Extras>({
    plants: false,
    lights: false,
    lightsColour: 'warm',
  })

  const prompt = assembleRenderPrompt(brief)
  const legacyPrompt = assembleLegacyPrompt(pp, cc, env, mat, legacyLighting, extras)
  const legacyCopyText = stripHeadings(legacyPrompt)

  function update<K extends keyof RenderBrief>(key: K, value: RenderBrief[K]) {
    setBrief((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-5 py-8 sm:px-6 lg:py-10">
        <div className="mb-7">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">G-store Render Box</h1>
            <p className="text-neutral-400 text-sm mt-1">
              Render-to-real image editing for interiors, storefronts, and architectural views.
            </p>
          </div>
        </div>

        <TipsBanner />

        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-neutral-800">
          {([
            ['prompt-v1', 'Prompt Brief v1'],
            ['prompt-v2', 'Prompt Brief v2'],
            ['image', 'Image'],
            ['video', 'Video'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md text-xs font-medium transition-all cursor-pointer ${activeClass(activeTab === key)}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'prompt-v2' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] gap-8 items-start">
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-neutral-800 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-neutral-400">Platform</span>
                    <select
                      value={platformId}
                      onChange={(e) => setPlatformId(e.target.value as PromptPlatformId)}
                      className="h-10 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
                    >
                      {PROMPT_PLATFORMS.map((platform) => (
                        <option key={platform.id} value={platform.id}>{platform.label}</option>
                      ))}
                    </select>
                  </label>
                  <SelectField label="Source render" value={brief.sourceType} options={sourceTypes} onChange={(value) => update('sourceType', value)} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-neutral-400">Realism pass</span>
                    <select
                      value={brief.realismPass}
                      onChange={(e) => update('realismPass', e.target.value as RealismPass)}
                      className="h-10 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
                    >
                      {realismPasses.map((pass) => (
                        <option key={pass.value} value={pass.value}>{pass.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-4 space-y-3">
                <TextField label="Existing scene reading" value={brief.existingScene} onChange={(value) => update('existingScene', value)} rows={3} />
                <TextField label="Strict fixed geometry" value={brief.fixedGeometry} onChange={(value) => update('fixedGeometry', value)} rows={4} />
                <TextField label="Allowed change budget" value={brief.editableSurfaces} onChange={(value) => update('editableSurfaces', value)} rows={3} />
              </div>

              <ToggleSection
                label="Product Replacement"
                description="Swap an existing rendered object for a specific product or category."
                enabled={brief.productSwap.enabled}
                onToggle={() => update('productSwap', { ...brief.productSwap, enabled: !brief.productSwap.enabled })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Replace" value={brief.productSwap.target} onChange={(value) => update('productSwap', { ...brief.productSwap, target: value })} />
                  <Field label="Location" value={brief.productSwap.location} onChange={(value) => update('productSwap', { ...brief.productSwap, location: value })} />
                  <Field label="With" value={brief.productSwap.replacement} onChange={(value) => update('productSwap', { ...brief.productSwap, replacement: value })} />
                  <Field label="Reference label" value={brief.productSwap.referenceLabel} onChange={(value) => update('productSwap', { ...brief.productSwap, referenceLabel: value })} />
                </div>
              </ToggleSection>

              <ToggleSection
                label="Colour Change"
                description="Apply palette references only to named targets."
                enabled={brief.colourChange.enabled}
                onToggle={() => update('colourChange', { ...brief.colourChange, enabled: !brief.colourChange.enabled })}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Target" value={brief.colourChange.target} onChange={(value) => update('colourChange', { ...brief.colourChange, target: value })} />
                  <Field label="Palette source" value={brief.colourChange.paletteSource} onChange={(value) => update('colourChange', { ...brief.colourChange, paletteSource: value })} />
                </div>
              </ToggleSection>

              <ToggleSection
                label="Environment Fill"
                description="Fill blank context areas without redesigning the architecture."
                enabled={brief.environmentFill.enabled}
                onToggle={() => update('environmentFill', { ...brief.environmentFill, enabled: !brief.environmentFill.enabled })}
              >
                <div className="space-y-3">
                  <Field label="Area" value={brief.environmentFill.area} onChange={(value) => update('environmentFill', { ...brief.environmentFill, area: value })} />
                  <Field label="Becomes" value={brief.environmentFill.replacement} onChange={(value) => update('environmentFill', { ...brief.environmentFill, replacement: value })} />
                  <Field label="Match to" value={brief.environmentFill.matchTo} onChange={(value) => update('environmentFill', { ...brief.environmentFill, matchTo: value })} />
                </div>
              </ToggleSection>

              <ToggleSection
                label="Materials"
                description="Upgrade render-flat surfaces into believable real-world finishes."
                enabled={brief.materialSchedule.enabled}
                onToggle={() => update('materialSchedule', { ...brief.materialSchedule, enabled: !brief.materialSchedule.enabled })}
              >
                <TextField label="Material behaviour" value={brief.materialSchedule.value} onChange={(value) => update('materialSchedule', { ...brief.materialSchedule, value })} rows={4} />
              </ToggleSection>

              <div className="rounded-lg border border-neutral-800 p-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-neutral-400 mb-2">Lighting preset</p>
                  <div className="flex flex-wrap gap-2">
                    {LIGHTING_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => update('lightingTreatment', preset.value)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all duration-150 cursor-pointer ${activeClass(brief.lightingTreatment === preset.value)}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <TextField label="Lighting physics" value={brief.lightingTreatment} onChange={(value) => update('lightingTreatment', value)} rows={4} />
                <TextField label="Camera and photo treatment" value={brief.cameraTreatment} onChange={(value) => update('cameraTreatment', value)} rows={3} />
              </div>

              <ToggleSection
                label="People / Staffage"
                description="Add people as scale and atmosphere, integrated into the render."
                enabled={brief.people.enabled}
                onToggle={() => update('people', { ...brief.people, enabled: !brief.people.enabled })}
              >
                <div className="space-y-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-neutral-400">Mode</span>
                    <select
                      value={brief.people.mode}
                      onChange={(e) => update('people', { ...brief.people, mode: e.target.value as PeopleMode })}
                      className="h-10 rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-200 focus:outline-none focus:border-neutral-500"
                    >
                      {peopleModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>{mode.label}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Placement" value={brief.people.placement} onChange={(value) => update('people', { ...brief.people, placement: value })} />
                  <TextField label="Description" value={brief.people.description} onChange={(value) => update('people', { ...brief.people, description: value })} rows={3} />
                </div>
              </ToggleSection>

              <ToggleSection
                label="Mirrors / Glass"
                description="Specify reflections and what is visible beyond glazing."
                enabled={brief.mirrorGlassNotes.enabled}
                onToggle={() => update('mirrorGlassNotes', { ...brief.mirrorGlassNotes, enabled: !brief.mirrorGlassNotes.enabled })}
              >
                <TextField label="Reflection and glazing notes" value={brief.mirrorGlassNotes.value} onChange={(value) => update('mirrorGlassNotes', { ...brief.mirrorGlassNotes, value })} rows={3} />
              </ToggleSection>

              <TextField label="Forbidden drift" value={brief.forbiddenChanges} onChange={(value) => update('forbiddenChanges', value)} rows={4} />
            </div>

            <div className="lg:sticky lg:top-8">
              <PromptPreview assembled={prompt} copyText={prompt} platformId={platformId} />
            </div>
          </div>
        ) : null}

        {activeTab === 'prompt-v1' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="flex flex-col gap-3">
              <ToggleSection
                label="Product Placement"
                description="Does the render contain products that need to be replaced?"
                enabled={pp.enabled}
                onToggle={() => setPp((current) => ({ ...current, enabled: !current.enabled }))}
              >
                <div className="text-sm text-neutral-400 leading-relaxed">
                  Replace all of the{' '}
                  <InlineField value={pp.product} onChange={(value) => setPp((current) => ({ ...current, product: value }))} placeholder="clear boxes" />
                  {' '}in/on{' '}
                  <InlineField value={pp.location} onChange={(value) => setPp((current) => ({ ...current, location: value }))} placeholder="the shelves inside the store" />
                  {' '}with{' '}
                  <InlineField value={pp.replacement} onChange={(value) => setPp((current) => ({ ...current, replacement: value }))} placeholder="packaged duvets, pillows, and blankets" />
                  {' '}similar to reference image{' '}
                  <InlineField value={pp.refImage} onChange={(value) => setPp((current) => ({ ...current, refImage: value }))} placeholder="3" />.
                </div>
              </ToggleSection>

              <ToggleSection
                label="Colour of Products"
                description="Does the product require a colour change?"
                enabled={cc.enabled}
                onToggle={() => setCc((current) => ({ ...current, enabled: !current.enabled }))}
              >
                <div className="text-sm text-neutral-400 leading-relaxed">
                  Apply the colours from the colour palette in{' '}
                  <InlineField value={cc.paletteRef} onChange={(value) => setCc((current) => ({ ...current, paletteRef: value }))} placeholder="reference image 2" />
                  {' '}to{' '}
                  <InlineField value={cc.targets} onChange={(value) => setCc((current) => ({ ...current, targets: value }))} placeholder="The white products" />.
                </div>
              </ToggleSection>

              <ToggleSection
                label="Environment"
                description="Is there blank space in the render you want to fill?"
                enabled={env.enabled}
                onToggle={() => setEnv((current) => ({ ...current, enabled: !current.enabled }))}
              >
                <div className="text-sm text-neutral-400 leading-relaxed">
                  The white-space{' '}
                  <InlineField value={env.whiteSpace} onChange={(value) => setEnv((current) => ({ ...current, whiteSpace: value }))} placeholder="around the storefront" />
                  {' '}becomes{' '}
                  <InlineField value={env.becomes} onChange={(value) => setEnv((current) => ({ ...current, becomes: value }))} placeholder="the interior of a lively, modern shopping mall" />
                  , realistically matching the aesthetic of{' '}
                  <InlineField value={env.aesthetic} onChange={(value) => setEnv((current) => ({ ...current, aesthetic: value }))} placeholder="the storefront" />.
                </div>
              </ToggleSection>

              <ToggleSection
                label="Textures / Materials"
                description="Specify surfaces and finishes? (recommended off for first try)"
                enabled={mat.enabled}
                onToggle={() => setMat((current) => ({ ...current, enabled: !current.enabled }))}
              >
                <div className="text-sm text-neutral-400 leading-relaxed space-y-2">
                  <p>
                    The roof and walls have{' '}
                    <InlineField value={mat.roofWalls} onChange={(value) => setMat((current) => ({ ...current, roofWalls: value }))} placeholder="a textured paint look and feel" />.
                  </p>
                  <p>
                    The flooring of the interior{' '}
                    <InlineField value={mat.flooring} onChange={(value) => setMat((current) => ({ ...current, flooring: value }))} placeholder="is tiled maintaining the pattern shown" />.
                  </p>
                </div>
              </ToggleSection>

              <div className="border border-neutral-800 rounded-lg px-4 py-3">
                <p className="text-sm font-medium text-neutral-200 mb-2">Lighting</p>
                <textarea
                  value={legacyLighting}
                  onChange={(event) => setLegacyLighting(event.target.value)}
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

            <div className="lg:sticky lg:top-8">
              <PromptPreview assembled={legacyPrompt} copyText={legacyCopyText} platformId={platformId} />
            </div>
          </div>
        ) : null}

        {activeTab === 'image' ? (
          <BlockedFeature title="Image generation is paused" description="The prompt briefs are available while generation is blocked off for now." />
        ) : null}

        {activeTab === 'video' ? (
          <BlockedFeature title="Video generation is paused" description="Video controls are blocked off for now while the prompt workflow is reviewed." />
        ) : null}

        <SuggestionBox />
      </div>
    </div>
  )
}

export default function App() {
  return <AppInner />
}
