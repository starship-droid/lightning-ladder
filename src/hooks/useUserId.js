import { useState } from 'react'

const STORAGE_KEY = 'lightning-ladder__user-id'

/**
 * Returns a persistent anonymous user ID stored in localStorage.
 * Used to identify room owners across sessions without auth.
 */
function getOrCreateUserId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // If localStorage is unavailable, generate an ephemeral one
    return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
  }
}

export function useUserId() {
  const [userId] = useState(getOrCreateUserId)
  return userId
}
