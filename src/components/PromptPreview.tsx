import { useState, useRef, useEffect } from 'react'

interface PromptPreviewProps {
  assembled: string
  copyText: string
}

export default function PromptPreview({ assembled, copyText }: PromptPreviewProps) {
  const [editMode, setEditMode] = useState(false)
  const [editedText, setEditedText] = useState('')
  const [copied, setCopied] = useState<false | 'ok' | 'fail'>(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current) }
  }, [])

  const displayText = editMode ? editedText : assembled
  const charCount = editMode ? editedText.length : copyText.length

  function handleEditToggle() {
    if (!editMode) {
      setEditedText(assembled)
      setEditMode(true)
    } else {
      setEditMode(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied('ok')
    } catch {
      setCopied('fail')
    }
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-mono tabular-nums ${charCount > 1500 ? 'text-red-400' : 'text-neutral-500'}`}>
          {charCount} / 1500
        </span>
        <div className="flex items-center gap-2">
          {editMode ? (
            <button
              type="button"
              onClick={() => setEditedText(assembled)}
              className="text-xs text-neutral-500 hover:text-white transition-colors cursor-pointer"
            >
              Reset
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleEditToggle}
            title={editMode ? 'Done editing' : 'Edit prompt'}
            className="text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded border border-neutral-700 hover:border-neutral-500 cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none"
          >
            {editMode ? '✓' : '✎'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-neutral-400 hover:text-white transition-colors px-3 py-1 rounded border border-neutral-700 hover:border-neutral-500 cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none"
          >
            {copied === 'ok' ? 'Copied!' : copied === 'fail' ? 'Copy failed' : 'Copy'}
          </button>
        </div>
      </div>
      {editMode ? (
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="flex-1 min-h-[520px] bg-neutral-800 border border-neutral-600 rounded-lg px-4 py-3 text-sm text-neutral-100 resize-none focus:outline-none focus:border-neutral-400 font-mono leading-relaxed w-full"
        />
      ) : (
        <div className="flex-1 min-h-[520px] bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-sm text-neutral-300 overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {displayText}
        </div>
      )}
    </div>
  )
}
