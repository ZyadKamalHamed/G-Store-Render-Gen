import type { PromptFields } from '../gemini'

interface PromptFormProps {
  fields: PromptFields
  onChange: (fields: PromptFields) => void
  onSubmit: () => void
  loading: boolean
}

const inputs: { key: keyof PromptFields; label: string; placeholder: string; required?: boolean }[] = [
  { key: 'roomType', label: 'Room type', placeholder: 'e.g. open-plan kitchen and living area', required: true },
  { key: 'style', label: 'Style', placeholder: 'e.g. contemporary Australian, warm minimalist, Japandi', required: true },
  { key: 'materials', label: 'Key materials and finishes', placeholder: 'e.g. honed Calacatta marble, oiled white oak, brushed bronze', required: true },
  { key: 'lighting', label: 'Lighting', placeholder: 'e.g. soft north-facing afternoon light, warm recessed coves', required: true },
  { key: 'mood', label: 'Mood', placeholder: 'e.g. calm and editorial, lived-in and inviting', required: true },
  { key: 'extras', label: 'Additional details', placeholder: 'e.g. fresh flowers on the bench, open cookbook, steam rising from a cup' },
]

export default function PromptForm({ fields, onChange, onSubmit, loading }: PromptFormProps) {
  function handleChange(key: keyof PromptFields, value: string) {
    onChange({ ...fields, [key]: value })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {inputs.map(({ key, label, placeholder, required }) => (
        <div key={key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-300">
            {label}
            {required && <span className="text-neutral-500 ml-1">*</span>}
          </label>
          <input
            type="text"
            value={fields[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={placeholder}
            required={required}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-neutral-900 font-semibold py-2.5 rounded-lg text-sm hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
      >
        {loading ? 'Generating...' : 'Generate prompt'}
      </button>
    </form>
  )
}
