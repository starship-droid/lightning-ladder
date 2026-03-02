import { useState, useEffect, useCallback } from 'react'

/**
 * Generate a 6-char alphanumeric room code
 */
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let id = ''
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)]
  }
  return id
}

/**
 * Parse the current hash to extract a room ID
 * Supports: #/room/ABC123  or  #ABC123
 */
function getRoomIdFromHash() {
  const hash = window.location.hash
  // #/room/XXXXXX
  const match = hash.match(/^#\/room\/([A-Za-z0-9]{6})$/i)
  if (match) return match[1].toUpperCase()
  return null
}

export function useRoom() {
  const [roomId, setRoomId] = useState(() => getRoomIdFromHash())
  const [view, setView] = useState(() => getRoomIdFromHash() ? 'room' : 'home')

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const id = getRoomIdFromHash()
      if (id) {
        setRoomId(id)
        setView('room')
      } else {
        setRoomId(null)
        setView('home')
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const createRoom = useCallback(() => {
    const id = generateRoomId()
    window.location.hash = `/room/${id}`
    return id
  }, [])

  const joinRoom = useCallback((code) => {
    const cleaned = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (cleaned.length !== 6) return false
    window.location.hash = `/room/${cleaned}`
    return true
  }, [])

  const goHome = useCallback(() => {
    window.location.hash = ''
  }, [])

  const getRoomUrl = useCallback((id) => {
    const base = window.location.origin + window.location.pathname
    return `${base}#/room/${id || roomId}`
  }, [roomId])

  return { roomId, view, createRoom, joinRoom, goHome, getRoomUrl }
}
