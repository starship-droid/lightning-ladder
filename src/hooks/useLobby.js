import { useEffect, useRef, useCallback, useState } from 'react'
import Ably from 'ably'

const LOBBY_CHANNEL = 'lightning-ladder__lobby'

/**
 * Manages the lobby: lists public rooms, tracks presence counts
 */
export function useLobby() {
  const clientRef = useRef(null)
  const channelRef = useRef(null)
  const isMounted = useRef(true)
  const [publicRooms, setPublicRooms] = useState([])

  useEffect(() => {
    isMounted.current = true

    const apiKey = import.meta.env.VITE_ABLY_API_KEY
    if (!apiKey) return

    let client
    try {
      client = new Ably.Realtime({
        key: apiKey,
        clientId: 'lobby-' + Math.random().toString(36).slice(2),
      })
    } catch {
      return
    }
    clientRef.current = client

    const channel = client.channels.get(LOBBY_CHANNEL, { params: { rewind: '1' } })
    channelRef.current = channel

    // Subscribe to room list updates
    channel.subscribe('room-list', (message) => {
      if (isMounted.current && message.data) {
        setPublicRooms(message.data)
      }
    })

    // Also subscribe to individual room updates
    channel.subscribe('room-update', (message) => {
      if (isMounted.current && message.data) {
        setPublicRooms((prev) => {
          const room = message.data
          if (room.removed) {
            return prev.filter((r) => r.id !== room.id)
          }
          const idx = prev.findIndex((r) => r.id === room.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = room
            return next
          }
          return [...prev, room]
        })
      }
    })

    return () => {
      isMounted.current = false
      channel.unsubscribe()
      client.close()
    }
  }, [])

  const publishRoomUpdate = useCallback((roomData) => {
    channelRef.current?.publish('room-update', roomData)
  }, [])

  return { publicRooms, publishRoomUpdate }
}
