import { useState } from 'react'
import ModelSelector from './components/ModelSelector'
import PromptForm from './components/PromptForm'
import OutputPanel from './components/OutputPanel'
import ImageUpload from './components/ImageUpload'
import { generatePrompt, type PromptFields, type ModelId } from './gemini'

const defaultFields: PromptFields = {
  roomType: '',
  style: '',
  materials: '',
  lighting: '',
  mood: '',
  extras: '',
}

export default function App() {
  const [fields, setFields] = useState<PromptFields>(defaultFields)
  const [model, setModel] = useState<ModelId>('nano-banana-pro')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    setPrompt('')
    try {
      const result = await generatePrompt(fields, model)
      setPrompt(result)
    } catch (e) {
      setError('Something went wrong. Check your API key and try again.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Render Prompt Generator</h1>
          <p className="text-neutral-400 text-sm mt-1">Fill in the brief, get an optimised prompt for Nano Banana.</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-neutral-400 mb-2">Model</p>
          <ModelSelector value={model} onChange={setModel} />
        </div>

        <PromptForm
          fields={fields}
          onChange={setFields}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {error && (
          <p className="mt-4 text-sm text-red-400">{error}</p>
        )}

        {prompt && <OutputPanel prompt={prompt} />}

        <ImageUpload />
      </div>
    </div>
  )
}
