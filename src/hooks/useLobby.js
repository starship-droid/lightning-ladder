import { useEffect, useRef, useCallback, useState } from 'react'
import Ably from 'ably'

const LOBBY_CHANNEL = 'lightning-ladder__lobby'

/** Rooms not updated within this window are considered stale and pruned */
const STALE_TIMEOUT_MS = 300_000 // 5 minutes
const STALE_CHECK_INTERVAL_MS = 30_000 // check every 30 s

/**
 * Manages the lobby: lists public rooms, tracks presence counts.
 * Rooms are kept alive by periodic heartbeat messages from the Room
 * component; entries that stop heartbeating are pruned automatically.
 */
export function useLobby() {
  const clientRef = useRef(null)
  const channelRef = useRef(null)
  const isMounted = useRef(true)
  const [publicRooms, setPublicRooms] = useState([])
  const [lobbyReady, setLobbyReady] = useState(false)

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

    // Once the channel attaches, rewind messages have been delivered,
    // so we know the lobby state is up-to-date.
    channel.once('attached', () => {
      if (isMounted.current) setLobbyReady(true)
    })

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
          // Stamp a local lastSeen so we can prune stale entries
          const stamped = { ...room, lastSeen: Date.now() }
          const idx = prev.findIndex((r) => r.id === room.id)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = stamped
            return next
          }
          return [...prev, stamped]
        })
      }
    })

    // Periodically prune rooms whose heartbeat has stopped
    const pruneInterval = setInterval(() => {
      if (!isMounted.current) return
      const now = Date.now()
      setPublicRooms((prev) => {
        const next = prev.filter((r) => now - (r.lastSeen || 0) < STALE_TIMEOUT_MS)
        return next.length === prev.length ? prev : next
      })
    }, STALE_CHECK_INTERVAL_MS)

    return () => {
      isMounted.current = false
      clearInterval(pruneInterval)
      channel.unsubscribe()
      client.close()
    }
  }, [])

  const publishRoomUpdate = useCallback((roomData) => {
    channelRef.current?.publish('room-update', roomData)
  }, [])

  return { publicRooms, publishRoomUpdate, lobbyReady }
}
