export default function ImageUpload() {
  return (
    <div className="relative mt-6">
      <div className="border border-dashed border-neutral-700 rounded-lg p-6 flex flex-col items-center gap-2 opacity-40 select-none pointer-events-none">
        <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="text-sm text-neutral-400">Upload render photo to make it photorealistic</span>
      </div>
      <span className="absolute top-3 right-3 text-xs bg-neutral-700 text-neutral-300 px-2 py-0.5 rounded-full">
        Coming soon
      </span>
    </div>
  )
}
