import { useEffect, useRef, useState } from 'react'
import Ably from 'ably'

/**
 * Probes Ably presence to check if a room exists (has active members).
 * Debounces lookups by 300ms so we don't hammer the API on every keystroke.
 *
 * @param {string} roomCode – raw user input
 * @returns {{ exists: boolean, memberCount: number, checking: boolean }}
 */
export function useRoomLookup(roomCode) {
  const clientRef = useRef(null)
  const isMounted = useRef(true)
  const [result, setResult] = useState({ exists: false, memberCount: 0, checking: false })

  // Maintain a single Ably client while the component is mounted
  useEffect(() => {
    isMounted.current = true

    const apiKey = import.meta.env.VITE_ABLY_API_KEY
    if (!apiKey) return

    let client
    try {
      client = new Ably.Realtime({
        key: apiKey,
        clientId: 'lookup-' + Math.random().toString(36).slice(2),
      })
    } catch {
      return
    }
    clientRef.current = client

    return () => {
      isMounted.current = false
      client.close()
      clientRef.current = null
    }
  }, [])

  // Debounced presence check whenever the code changes
  useEffect(() => {
    const cleaned = roomCode?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')

    // Only probe when input is exactly 6 alphanumeric chars
    if (!cleaned || cleaned.length !== 6 || roomCode?.trim().length !== 6) {
      setResult({ exists: false, memberCount: 0, checking: false })
      return
    }

    setResult((prev) => ({ ...prev, checking: true }))

    const timer = setTimeout(async () => {
      const client = clientRef.current
      if (!client || !isMounted.current) return

      try {
        const channelName = `lightning-ladder__room_${cleaned}__presence`
        const channel = client.channels.get(channelName)
        const members = await channel.presence.get()

        if (isMounted.current) {
          setResult({
            exists: members.length > 0,
            memberCount: members.length,
            checking: false,
          })
        }

        // Detach so we don't keep an idle channel subscription open
        channel.detach()
      } catch {
        if (isMounted.current) {
          setResult({ exists: false, memberCount: 0, checking: false })
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [roomCode])

  return result
}
