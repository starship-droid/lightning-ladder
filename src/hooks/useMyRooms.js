import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'lightning-ladder__my-rooms'

/** Remove "My Rooms" entries that have been empty for this long */
const STALE_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Persists rooms the current user has created in localStorage.
 * Each entry: { id, name, isPublic, createdAt, leftEmptyAt? }
 * Rooms are auto-pruned 5 minutes after being left empty.
 */
function pruneStale(rooms) {
  const now = Date.now()
  return rooms.filter((r) => !r.leftEmptyAt || now - r.leftEmptyAt < STALE_TIMEOUT_MS)
}

function loadRooms() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? pruneStale(JSON.parse(raw)) : []
  } catch {
    return []
  }
}

function saveRooms(rooms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))
  } catch {
    // storage full or disabled — ignore
  }
}

export function useMyRooms() {
  const [myRooms, setMyRooms] = useState(loadRooms)

  // Periodically prune stale rooms
  useEffect(() => {
    const interval = setInterval(() => {
      setMyRooms((prev) => {
        const next = pruneStale(prev)
        if (next.length === prev.length) return prev
        saveRooms(next)
        return next
      })
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  /** Add a new room, or upsert (clearing leftEmptyAt) if it already exists */
  const addRoom = useCallback((room) => {
    setMyRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === room.id)
      let next
      if (idx >= 0) {
        // Rejoining an existing room — clear the stale timer
        next = [...prev]
        next[idx] = { ...next[idx], ...room, leftEmptyAt: null }
      } else {
        next = [{ ...room, createdAt: Date.now() }, ...prev]
      }
      saveRooms(next)
      return next
    })
  }, [])

  const removeRoom = useCallback((roomId) => {
    setMyRooms((prev) => {
      const next = prev.filter((r) => r.id !== roomId)
      saveRooms(next)
      return next
    })
  }, [])

  /**
   * Called when leaving a room.
   * If wasEmpty=true, stamps leftEmptyAt so the 5-min pruner will remove it.
   * If wasEmpty=false (others still inside), clears the timer.
   */
  const markRoomLeft = useCallback((roomId, wasEmpty) => {
    setMyRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === roomId)
      if (idx === -1) return prev
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        leftEmptyAt: wasEmpty ? Date.now() : null,
      }
      saveRooms(next)
      return next
    })
  }, [])

  /** Clear the stale timer when rejoining a saved room */
  const refreshRoom = useCallback((roomId) => {
    setMyRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === roomId)
      if (idx === -1 || !prev[idx].leftEmptyAt) return prev
      const next = [...prev]
      next[idx] = { ...next[idx], leftEmptyAt: null }
      saveRooms(next)
      return next
    })
  }, [])

  return { myRooms, addRoom, removeRoom, markRoomLeft, refreshRoom }
}
