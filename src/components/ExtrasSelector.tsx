interface ExtrasSelectorProps {
  plants: boolean
  lights: boolean
  lightsColour: string
  onChange: (plants: boolean, lights: boolean, lightsColour: string) => void
}

import { activeClass } from '../utils/activeClass'

const pillClass = (active: boolean) =>
  `px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${activeClass(active)}`

export default function ExtrasSelector({ plants, lights, lightsColour, onChange }: ExtrasSelectorProps) {
  return (
    <div className="border border-neutral-800 rounded-lg px-4 py-3">
      <p className="text-sm font-medium text-neutral-200 mb-3">Extras</p>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(!plants, lights, lightsColour)}
          className={pillClass(plants)}
        >
          Plants
        </button>
        <button
          type="button"
          onClick={() => onChange(plants, !lights, lightsColour)}
          className={pillClass(lights)}
        >
          Lights
        </button>
      </div>
      {lights ? (
        <div className="mt-3 animate-fade-in">
          <p className="text-xs text-neutral-500 mb-2">Light colour</p>
          <div className="flex gap-2">
            {(['warm', 'white'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(plants, lights, c)}
                className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-all duration-150 ${
                  lightsColour === c
                    ? 'bg-white text-neutral-900'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:border-neutral-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
