import { useEffect, useRef, useCallback } from 'react'
import Ably from 'ably'

// Derive a channel name from the deployment URL so each team is isolated
const CHANNEL_NAME = 'lightning-ladder__' +
  (window.location.hostname + window.location.pathname)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

export function useAbly({ onStateUpdate, onConnected, onDisconnected }) {
  const clientRef  = useRef(null)
  const channelRef = useRef(null)
  const isMounted  = useRef(true)

  useEffect(() => {
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

    const channel = client.channels.get(CHANNEL_NAME)
    channelRef.current = channel

    // Subscribe to state updates from other clients
    channel.subscribe('state', (message) => {
      if (isMounted.current && message.data) {
        onStateUpdate?.(message.data)
      }
    })

    // Also get the last known state from history on join
    channel.history({ limit: 1 }, (err, page) => {
      if (err || !isMounted.current) return
      const items = page?.items || []
      if (items.length > 0 && items[0].data) {
        onStateUpdate?.(items[0].data)
      }
    })

    return () => {
      isMounted.current = false
      channel.unsubscribe()
      client.close()
    }
  }, []) // eslint-disable-line

  const publish = useCallback((state) => {
    channelRef.current?.publish('state', state)
  }, [])

  return { publish }
}