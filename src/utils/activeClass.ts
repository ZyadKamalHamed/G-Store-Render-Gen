export function activeClass(active: boolean): string {
  return active
    ? 'bg-white text-neutral-900 shadow-[0_2px_10px_rgba(255,255,255,0.15)]'
    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:border-neutral-500'
}
