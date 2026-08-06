export interface LightingPreset {
  id: string
  label: string
  value: string
}

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'bright-retail',
    label: 'Bright retail',
    value:
      'Bright premium retail photography: clean lifted exposure, soft bounced fill light, warm practical lights on, bright but natural whites, gentle contact shadows, lively highlights on glass/metal, no dull grey cast.',
  },
  {
    id: 'daylight-fill',
    label: 'Daylight fill',
    value:
      'Fresh daylight interior photo: generous window light, soft bounced fill, open shadows, natural colour temperature, crisp whites, subtle ambient occlusion, realistic highlights without overexposure.',
  },
  {
    id: 'warm-evening',
    label: 'Warm evening',
    value:
      'Warm evening retail photo: practical lights glowing, soft amber bounce, inviting highlights, controlled contrast, visible contact shadows, realistic exposure, no muddy dark corners.',
  },
  {
    id: 'gallery-clean',
    label: 'Gallery clean',
    value:
      'Clean gallery-style lighting: even wall wash, accurate neutral whites, soft shadows under objects, refined reflections, balanced exposure, bright polished presentation without flat CGI lighting.',
  },
]
