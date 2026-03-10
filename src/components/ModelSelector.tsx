import { MODELS, type ModelId } from '../gemini'

interface ModelSelectorProps {
  value: ModelId
  onChange: (value: ModelId) => void
}

export default function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="flex gap-2 p-1 bg-neutral-800 rounded-lg w-fit">
      {(Object.keys(MODELS) as ModelId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === id
              ? 'bg-white text-neutral-900'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          {MODELS[id].label}
        </button>
      ))}
    </div>
  )
}
