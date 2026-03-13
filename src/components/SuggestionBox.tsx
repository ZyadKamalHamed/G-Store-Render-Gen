import { useState } from 'react'

export default function SuggestionBox() {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ suggestion: text }),
      })
      if (!res.ok) throw new Error()
      setText('')
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      {/* Divider */}
      <div className="relative flex items-center justify-center my-12">
        <div className="absolute inset-x-0 h-px" style={{ background: 'linear-gradient(to right, transparent, #525252 20%, #525252 80%, transparent)' }} />
        <span className="relative bg-neutral-950 px-4 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
          Suggestions
        </span>
      </div>

      <div className="max-w-xl mx-auto">
        <p className="text-sm text-neutral-400 mb-4 text-center">
          Got an idea or spotted something off? Leave a note and we'll look into it.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); if (status !== 'idle') setStatus('idle') }}
            placeholder="Your suggestion..."
            rows={3}
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-neutral-500 focus:ring-2 focus:ring-white/10 leading-relaxed"
          />
          <div className="flex items-center justify-between gap-4">
            {status === 'sent' ? (
              <p className="text-xs text-green-400">Thanks, got it!</p>
            ) : status === 'error' ? (
              <p className="text-xs text-red-400">Something went wrong, try again.</p>
            ) : <span />}
            <button
              type="submit"
              disabled={!text.trim() || status === 'sending'}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-white text-neutral-900 hover:bg-neutral-100 cursor-pointer"
            >
              {status === 'sending' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
