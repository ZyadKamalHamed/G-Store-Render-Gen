import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface ProfileMenuProps {
  user: User
}

export default function ProfileMenu({ user }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initial = (user.email ?? '?')[0].toUpperCase()
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 transition-colors text-sm font-semibold text-white shrink-0 cursor-pointer focus:ring-2 focus:ring-white/20 focus:outline-none"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${user.email} profile`} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-52 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 p-3 flex flex-col gap-3 animate-fade-in">
          <p className="text-xs text-neutral-400 truncate">{user.email}</p>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-neutral-400 hover:text-white text-left transition-colors cursor-pointer disabled:opacity-50"
          >
            {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
