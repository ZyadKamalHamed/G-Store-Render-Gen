export type SourceRenderType = 'Vectorworks render' | 'SketchUp render' | '3D render' | 'CAD viewport' | 'finished flat render'

export type RealismPass = 'photographic' | 'material-upgrade' | 'lighting-upgrade' | 'client-presentation'

export type PeopleMode = 'none' | 'sharp' | 'background' | 'motion-blur'

export type ReferenceImageRole =
  | 'product-packshot'
  | 'material-sample'
  | 'palette'
  | 'lighting-mood'
  | 'people-scale'
  | 'exterior-context'

export interface ToggleText {
  enabled: boolean
  value: string
}

export interface ProductSwap {
  enabled: boolean
  target: string
  location: string
  replacement: string
  referenceLabel: string
}

export interface ColourChange {
  enabled: boolean
  target: string
  paletteSource: string
}

export interface EnvironmentFill {
  enabled: boolean
  area: string
  replacement: string
  matchTo: string
}

export interface PeopleBrief {
  enabled: boolean
  mode: PeopleMode
  placement: string
  description: string
}

export interface ReferenceRoleInstruction {
  role: ReferenceImageRole
  label: string
  notes: string
}

export interface RenderBrief {
  sourceType: SourceRenderType
  realismPass: RealismPass
  existingScene: string
  fixedGeometry: string
  editableSurfaces: string
  materialSchedule: ToggleText
  lightingTreatment: string
  cameraTreatment: string
  productSwap: ProductSwap
  colourChange: ColourChange
  environmentFill: EnvironmentFill
  people: PeopleBrief
  mirrorGlassNotes: ToggleText
  forbiddenChanges: string
  referenceRoles: ReferenceRoleInstruction[]
}

const roleCopy: Record<ReferenceImageRole, string> = {
  'product-packshot': 'product only: identity, shape, packaging, material, colour; ignore background/camera.',
  'material-sample': 'material only: grain, roughness, sheen, veining/weave; do not copy layout.',
  palette: 'palette only; apply only to named targets.',
  'lighting-mood': 'lighting mood only: exposure, contrast, colour temp; keep base composition.',
  'people-scale': 'scale/posture/clothing only; match base perspective and shadows.',
  'exterior-context': 'context beyond glass/storefront only; do not redesign interior.',
}

export const defaultRenderBrief: RenderBrief = {
  sourceType: 'Vectorworks render',
  realismPass: 'photographic',
  existingScene:
    'Retail interior/storefront with shelving, product zones, fixed joinery, ceiling lights, glazing, wide architectural view.',
  fixedGeometry:
    'Preserve camera angle, crop, perspective, room proportions, walls/windows/doors, ceiling height, fixed joinery, shelving layout, light fixture positions, object count, signage, spatial relationships.',
  editableSurfaces:
    'Only named products, finishes, light quality, plants, people, and blank exterior/context areas may change.',
  materialSchedule: {
    enabled: true,
    value:
      'Replace flat CGI surfaces with subtle plaster, real flooring seams/roughness, glass reflections, fabric weave where relevant, crisp packaging edges, small natural imperfections.',
  },
  lightingTreatment:
    'Bright premium retail photography: clean lifted exposure, soft bounced fill light, warm practical lights on, bright but natural whites, gentle contact shadows, lively highlights on glass/metal, no dull grey cast.',
  cameraTreatment:
    'Professional interior architecture photo, same viewpoint, wide-angle not warped, straight architectural lines, natural depth, no CGI glow.',
  productSwap: {
    enabled: false,
    target: 'clear boxes',
    location: 'the shelves inside the store',
    replacement: 'packaged duvets, pillows, and blankets',
    referenceLabel: 'reference image 2',
  },
  colourChange: {
    enabled: false,
    target: 'the white products/new products added to the shot',
    paletteSource: 'reference image 3',
  },
  environmentFill: {
    enabled: false,
    area: 'the white space around the storefront and outside the rear window',
    replacement: 'the interior of a lively modern shopping mall',
    matchTo: 'the storefront perspective, lighting, and scale',
  },
  people: {
    enabled: false,
    mode: 'background',
    placement: 'one or two shoppers in the background circulation zone',
    description:
      'natural casual shoppers used for scale, integrated with correct contact shadows, clothing light wrap, and believable posture',
  },
  mirrorGlassNotes: {
    enabled: false,
    value:
      'For mirrors and glass, show reflections consistent with the opposite wall and the visible shop/mall context. Do not invent impossible reflected rooms.',
  },
  forbiddenChanges:
    'No moved architecture/joinery/shelves/furniture/camera, warped geometry, floating objects, mismatched scale, random decor, distorted text, watermarks, plastic people.',
  referenceRoles: [],
}

function sentence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function labelForPass(pass: RealismPass): string {
  if (pass === 'material-upgrade') return 'material-accurate real photo'
  if (pass === 'lighting-upgrade') return 'real architectural photo with improved lighting'
  if (pass === 'client-presentation') return 'client-ready interior photo'
  return 'photoreal interior photo'
}

function peopleModeCopy(mode: PeopleMode): string {
  if (mode === 'sharp') return 'sharp but secondary.'
  if (mode === 'motion-blur') return 'long-exposure staffage, natural motion blur, no distracting facial detail.'
  if (mode === 'background') return 'subtle background staffage for scale.'
  return ''
}

export function referenceRoleCopy(ref: ReferenceRoleInstruction): string {
  const note = ref.notes.trim() ? ` ${sentence(ref.notes)}` : ''
  return `${ref.label}: ${roleCopy[ref.role]}${note}`.trim()
}

export function assembleRenderPrompt(brief: RenderBrief): string {
  const sections = [
    `IMG2IMG: Uploaded ${brief.sourceType} is source of truth. Convert to ${labelForPass(brief.realismPass)}; preserve base render unless explicitly edited.`,
    `Preserve: ${sentence(brief.fixedGeometry)}`,
    `Scene: ${sentence(brief.existingScene)}`,
    `Change budget: ${sentence(brief.editableSurfaces)}`,
  ]

  if (brief.productSwap.enabled) {
    const ref = brief.productSwap.referenceLabel.trim()
      ? ` Use ${brief.productSwap.referenceLabel.trim()} only for product identity/material/colour/packaging.`
      : ''
    sections.push(
      `Product edit: replace ${brief.productSwap.target.trim()} in/on ${brief.productSwap.location.trim()} with ${brief.productSwap.replacement.trim()}.${ref} Keep shelf layout, count, spacing, perspective, surroundings.`,
    )
  }

  if (brief.colourChange.enabled) {
    sections.push(
      `Colour edit: apply palette from ${brief.colourChange.paletteSource.trim()} only to ${brief.colourChange.target.trim()}; keep shape, size, count, placement.`,
    )
  }

  if (brief.environmentFill.enabled) {
    sections.push(
      `Context edit: change only ${brief.environmentFill.area.trim()} into ${brief.environmentFill.replacement.trim()}. Match ${brief.environmentFill.matchTo.trim()}, scale, perspective, depth, glass reflections.`,
    )
  }

  if (brief.materialSchedule.enabled) {
    sections.push(`Materials: ${sentence(brief.materialSchedule.value)}`)
  }

  sections.push(`Light: ${sentence(brief.lightingTreatment)}`)
  sections.push(`Camera: ${sentence(brief.cameraTreatment)}`)

  if (brief.people.enabled && brief.people.mode !== 'none') {
    sections.push(
      `People: add ${brief.people.placement.trim()}: ${sentence(brief.people.description)} ${peopleModeCopy(brief.people.mode)} Match floor plane, furniture, shadows, light direction.`,
    )
  }

  if (brief.mirrorGlassNotes.enabled) {
    sections.push(`Glass/mirrors: ${sentence(brief.mirrorGlassNotes.value)}`)
  }

  if (brief.referenceRoles.length > 0) {
    sections.push(`Refs: ${brief.referenceRoles.map(referenceRoleCopy).join(' ')}`)
  }

  sections.push(`Avoid: ${sentence(brief.forbiddenChanges)}`)

  return sections.join('\n\n')
}
