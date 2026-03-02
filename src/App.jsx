import { useCallback, useRef, useState } from 'react'
import { useRoom } from './hooks/useRoom'
import { useTheme } from './hooks/useTheme'
import { useLobby } from './hooks/useLobby'
import { HomeScreen } from './components/HomeScreen'
import { Room } from './components/Room'
import './index.css'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const { roomId, view, createRoom, joinRoom, goHome, getRoomUrl } = useRoom()
  const { publishRoomUpdate } = useLobby()
  const roomConfigRef = useRef(null)
  const [roomConfig, setRoomConfig] = useState(null)

  const handleCreateRoom = useCallback((config) => {
    const id = createRoom()
    const cfg = { ...config, id }
    roomConfigRef.current = cfg
    setRoomConfig(cfg)

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
  }, [createRoom, publishRoomUpdate])

  const handleJoinRoom = useCallback((code) => {
    const cfg = { isPublic: false, name: '', id: code }
    roomConfigRef.current = cfg
    setRoomConfig(cfg)
    joinRoom(code)
  }, [joinRoom])

  const handleLeave = useCallback(() => {
    roomConfigRef.current = null
    setRoomConfig(null)
    goHome()
  }, [goHome])

  if (view === 'room' && roomId) {
    return (
      <Room
        roomId={roomId}
        roomUrl={getRoomUrl()}
        roomConfig={roomConfig}
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
      theme={theme}
      onThemeToggle={toggleTheme}
    />
  )
}