import { useEffect, useRef, useCallback } from 'react'
import Ably from 'ably'

export function useAblyNotes({ roomId, onNotesUpdate, onBbbUrlUpdate }) {
  const clientRef  = useRef(null)
  const channelRef = useRef(null)
  const isMounted  = useRef(true)
  const timerRef   = useRef(null)

  useEffect(() => {
    if (!roomId) return
    isMounted.current = true

    const apiKey = import.meta.env.VITE_ABLY_API_KEY
    if (!apiKey) return

    let client
    try {
      client = new Ably.Realtime({
        key: apiKey,
        clientId: 'notes-' + Math.random().toString(36).slice(2),
      })
    } catch {
      return
    }
    clientRef.current = client

    // Room-scoped channel name for notes
    const channelName = `lightning-ladder__room_${roomId}__notes`
    const channel = client.channels.get(channelName, { params: { rewind: '1' } })
    channelRef.current = channel

    channel.subscribe('notes', (message) => {
      if (isMounted.current && message.data != null) {
        onNotesUpdate?.(message.data)
      }
    })

    channel.subscribe('bbb-url', (message) => {
      if (isMounted.current && message.data != null) {
        onBbbUrlUpdate?.(message.data)
      }
    })

    return () => {
      isMounted.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      channel.unsubscribe()
      client.close()
    }
  }, [roomId]) // eslint-disable-line

  // Debounced publish — waits 300ms after last keystroke to avoid flooding
  const publish = useCallback((text) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      channelRef.current?.publish('notes', text)
    }, 300)
  }, [])

  const publishBbbUrl = useCallback((data) => {
    channelRef.current?.publish('bbb-url', data)
  }, [])

  return { publish, publishBbbUrl }
}
