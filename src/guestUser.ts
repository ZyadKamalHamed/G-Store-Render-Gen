const GUEST_KEY = 'renderbox-guest-id'

export function getGuestUserId(): string {
  try {
    const existing = localStorage.getItem(GUEST_KEY)
    if (existing) return existing
    const next = `guest-${crypto.randomUUID()}`
    localStorage.setItem(GUEST_KEY, next)
    return next
  } catch {
    return 'guest-local-preview'
  }
}

export function getGuestUserEmail(): string {
  return 'guest@renderbox.local'
}
