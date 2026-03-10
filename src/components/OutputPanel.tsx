import { useState, useEffect, useRef } from 'react'

interface OutputPanelProps {
  prompt: string
}

export default function OutputPanel({ prompt }: OutputPanelProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-neutral-300">Generated prompt</span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs text-neutral-400 hover:text-white transition-colors px-3 py-1 rounded border border-neutral-700 hover:border-neutral-500"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <textarea
        readOnly
        value={prompt}
        rows={6}
        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 resize-none focus:outline-none w-full"
      />
    </div>
  )
}
