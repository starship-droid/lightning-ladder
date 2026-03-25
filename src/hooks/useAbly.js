import { useEffect, useRef, useCallback } from 'react'
import Ably from 'ably'

export function useAbly({ roomId, onStateUpdate, onConnected, onDisconnected }) {
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

    return () => {
      isMounted.current = false
      channel.unsubscribe()
      client.close()
    }
  }, [roomId]) // eslint-disable-line

  const publish = useCallback((state) => {
    channelRef.current?.publish('state', state)
  }, [])

  return { publish }
}