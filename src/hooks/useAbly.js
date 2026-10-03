import { useEffect, useRef, useCallback } from 'react'
import Ably from 'ably'

export function useAbly({ roomId, onStateUpdate, onSyncRequest, onResync, onConnected, onDisconnected }) {
  const clientRef  = useRef(null)
  const channelRef = useRef(null)
  const isMounted  = useRef(true)

  useEffect(() => {
    if (!roomId) return
    isMounted.current = true

    const apiKey = import.meta.env.VITE_ABLY_API_KEY
    if (!apiKey) {
      console.error('Missing VITE_ABLY_API_KEY')
      onDisconnected?.()
      return
    }

    let client
    try {
      client = new Ably.Realtime({ key: apiKey, clientId: 'client-' + Math.random().toString(36).slice(2) })
    } catch (e) {
      console.error('Ably init failed:', e)
      onDisconnected?.()
      return
    }
    clientRef.current = client

    client.connection.on('connected', () => {
      if (isMounted.current) onConnected?.()
    })

    client.connection.on('disconnected', () => {
      if (isMounted.current) onDisconnected?.()
    })

    client.connection.on('failed', () => {
      if (isMounted.current) onDisconnected?.()
    })

    // Room-scoped channel name — each room gets its own isolated channel
    const channelName = `lightning-ladder__room_${roomId}__state`
    const channel = client.channels.get(channelName, { params: { rewind: '1' } })
    channelRef.current = channel

    // Subscribe to state updates (including the rewound initial state)
    // message.timestamp is the Ably server-side time — a neutral clock reference
    // that callers can use to compensate for skew between publisher & subscriber clocks.
    channel.subscribe('state', (message) => {
      if (isMounted.current && message.data) {
        onStateUpdate?.(message.data, message.timestamp)
      }
    })

    // Another client is asking for the current state (it joined, or woke up after missing messages)
    channel.subscribe('sync-request', (message) => {
      if (isMounted.current && message.clientId !== client.auth.clientId) {
        onSyncRequest?.()
      }
    })

    // A non-resumed attach means we may have missed messages (first join, or a tab that
    // slept long enough to lose continuity), so local state can't be trusted until re-synced
    const handleAttach = (change) => {
      if (isMounted.current && !change.resumed) onResync?.()
    }
    channel.on('attached', handleAttach)
    channel.on('update', handleAttach)

    return () => {
      isMounted.current = false
      channel.off()
      channel.unsubscribe()
      client.close()
    }
  }, [roomId]) // eslint-disable-line

  const publish = useCallback((state) => {
    channelRef.current?.publish('state', state)
  }, [])

  const requestSync = useCallback(() => {
    channelRef.current?.publish('sync-request', {})
  }, [])

  return { publish, requestSync }
}