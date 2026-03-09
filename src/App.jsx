import { useCallback, useRef, useState } from 'react'
import { useRoom } from './hooks/useRoom'
import { useTheme } from './hooks/useTheme'
import { useLobby } from './hooks/useLobby'
import { useMyRooms } from './hooks/useMyRooms'
import { useUserId } from './hooks/useUserId'
import { HomeScreen } from './components/HomeScreen'
import { Room } from './components/Room'
import './index.css'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { roomId, view, createRoom, joinRoom, goHome, getRoomUrl } = useRoom()
  const { publishRoomUpdate } = useLobby()
  const { myRooms, addRoom, removeRoom, markRoomLeft, refreshRoom } = useMyRooms()
  const userId = useUserId()
  const roomConfigRef = useRef(null)
  const [roomConfig, setRoomConfig] = useState(null)

  const handleCreateRoom = useCallback((config) => {
    // If a specific room ID was requested (e.g. user typed a 6-char code
    // that doesn't map to an existing room), use it; otherwise generate one.
    let id
    if (config.id) {
      id = config.id
      joinRoom(id) // navigate to the room
    } else {
      id = createRoom()
    }
    const cfg = { ...config, id, ownerId: userId }
    roomConfigRef.current = cfg
    setRoomConfig(cfg)

    // Save to "My Rooms" so the user can find it again after leaving
    addRoom({ id, name: config.name || '', isPublic: !!config.isPublic })

    // If public, announce to lobby
    if (config.isPublic) {
      setTimeout(() => {
        publishRoomUpdate({
          id,
          name: config.name || '',
          memberCount: 1,
          isPublic: true,
        })
      }, 500)
    }
  }, [createRoom, joinRoom, publishRoomUpdate, addRoom, userId])

  const handleJoinRoom = useCallback((code) => {
    refreshRoom(code) // clear stale timer if this is a saved room
    const cfg = { isPublic: false, name: '', id: code }
    roomConfigRef.current = cfg
    setRoomConfig(cfg)
    joinRoom(code)
  }, [joinRoom, refreshRoom])

  const handleLeave = useCallback((wasEmpty) => {
    const leavingRoomId = roomConfigRef.current?.id
    if (leavingRoomId) {
      markRoomLeft(leavingRoomId, !!wasEmpty)
    }
    roomConfigRef.current = null
    setRoomConfig(null)
    goHome()
  }, [goHome, markRoomLeft])

  if (view === 'room' && roomId) {
    return (
      <Room
        roomId={roomId}
        roomUrl={getRoomUrl()}
        roomConfig={roomConfig}
        userId={userId}
        theme={theme}
        onThemeToggle={toggleTheme}
        onLeave={handleLeave}
      />
    )
  }

  return (
    <HomeScreen
      onCreateRoom={handleCreateRoom}
      onJoinRoom={handleJoinRoom}
      myRooms={myRooms}
      onRemoveMyRoom={removeRoom}
      theme={theme}
      onThemeToggle={toggleTheme}
    />
  )
}