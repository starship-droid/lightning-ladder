import { useEffect, useRef, useState } from 'react'
import Ably from 'ably'

/**
 * Track presence in a room using Ably presence.
 * Returns the count of people in the room and methods to enter/leave.
 */
export function useRoomPresence({ roomId }) {
  const clientRef = useRef(null)
  const channelRef = useRef(null)
  const isMounted = useRef(true)
  const [memberCount, setMemberCount] = useState(0)
  const [isLastOne, setIsLastOne] = useState(false)
  const [presenceReady, setPresenceReady] = useState(false)

  useEffect(() => {
    if (!roomId) return
    isMounted.current = true

    const apiKey = import.meta.env.VITE_ABLY_API_KEY
    if (!apiKey) return

    let client
    try {
      client = new Ably.Realtime({
        key: apiKey,
        clientId: 'presence-' + Math.random().toString(36).slice(2),
      })
    } catch {
      return
    }
    clientRef.current = client

    const channelName = `lightning-ladder__room_${roomId}__presence`
    const channel = client.channels.get(channelName)
    channelRef.current = channel

    const updateCount = async () => {
      try {
        const members = await channel.presence.get()
        const count = members.length
        if (isMounted.current) {
          setMemberCount(count)
          setIsLastOne(count <= 1)
          setPresenceReady(true)
        }
      } catch {
        // ignore
      }
    }

    // Enter presence
    channel.presence.enter({ joinedAt: Date.now() })

    // Listen for presence changes
    channel.presence.subscribe('enter', updateCount)
    channel.presence.subscribe('leave', updateCount)
    channel.presence.subscribe('update', updateCount)

    // Initial count
    updateCount()

    return () => {
      isMounted.current = false
      channel.presence.leave()
      channel.presence.unsubscribe()
      client.close()
    }
  }, [roomId])

  return { memberCount, isLastOne, presenceReady }
}
