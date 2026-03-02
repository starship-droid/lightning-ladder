import { useState, useEffect, useRef } from 'react'
import { useLobby } from '../hooks/useLobby'
import { ThemeToggle } from './ThemeToggle'
import styles from './HomeScreen.module.css'

/* ── SVG Icons (stroke style, matching ThemeToggle) ── */
const IconArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
)

const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconLock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
  </svg>
)

export function HomeScreen({ onCreateRoom, onJoinRoom, theme, onThemeToggle }) {
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [roomName, setRoomName] = useState('')
  const { publicRooms } = useLobby()
  const inputRef = useRef(null)

  useEffect(() => {
    if (joinError) {
      const t = setTimeout(() => setJoinError(''), 3000)
      return () => clearTimeout(t)
    }
  }, [joinError])

  const handleJoinByCode = () => {
    const cleaned = joinCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (cleaned.length !== 6) {
      setJoinError('Code must be 6 characters')
      return
    }
    onJoinRoom(cleaned)
  }

  const handleCreateRoom = () => {
    onCreateRoom({ isPublic, name: roomName.trim() })
  }

  // Sort rooms: most members first
  const sortedRooms = [...publicRooms]
    .filter((r) => !r.removed)
    .sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0))

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.sub}>// AGENDA TIMER</div>
            <div className={styles.logoRow}>
              <span className={styles.bolt}>⚡</span>
              <h1 className={styles.title}>
                LIGHTNING <em>LADDER</em>
              </h1>
            </div>
            <div className={styles.tagline}>REAL-TIME SPEAKER QUEUE &amp; TIMER</div>
          </div>
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        </div>

        {/* Quick actions — Join (left, smaller) then Create (right, bigger) */}
        <div className={styles.actions}>
          {/* Join by code */}
          <div className={`${styles.card} ${styles.cardJoin}`}>
            <div className={styles.cardLabel}>JOIN</div>
            <div className={styles.cardContent}>
              <p className={styles.cardDesc}>Enter a 6-character room code</p>
              <div className={styles.joinRow}>
                <input
                  ref={inputRef}
                  className={`${styles.codeInput} ${joinError ? styles.codeInputError : ''}`}
                  type="text"
                  placeholder="ABC123"
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                    setJoinError('')
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                />
                <button className="btn btn-blue" onClick={handleJoinByCode}>
                  JOIN <IconArrowRight />
                </button>
              </div>
              {joinError && <div className={styles.error}>{joinError}</div>}
            </div>
          </div>

          {/* Create room */}
          <div className={`${styles.card} ${styles.cardCreate}`}>
            <div className={styles.cardLabel}>CREATE</div>
            <div className={styles.cardContent}>
              <div className={styles.nameRow}>
                <label className={styles.fieldLabel}>ROOM NAME (OPTIONAL)</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="e.g. Sprint Review, Team Standup..."
                  maxLength={40}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>

              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>VISIBILITY</span>
                <div className={styles.visPills}>
                  <button
                    className={`${styles.visPill} ${!isPublic ? styles.visPillActive : ''}`}
                    onClick={() => setIsPublic(false)}
                  >
                    <IconLock /> PRIVATE
                  </button>
                  <button
                    className={`${styles.visPill} ${isPublic ? styles.visPillActivePublic : ''}`}
                    onClick={() => setIsPublic(true)}
                  >
                    <IconGlobe /> PUBLIC
                  </button>
                </div>
              </div>

              <button className="btn btn-amber" style={{ width: '100%' }} onClick={handleCreateRoom}>
                ⚡ CREATE ROOM
              </button>
            </div>
          </div>
        </div>

        {/* Public rooms lobby */}
        <div className={styles.lobby}>
          <div className={styles.lobbyHeader}>
            <span className={styles.lobbyTitle}>// PUBLIC ROOMS</span>
            <span className={styles.lobbyCount}>{sortedRooms.length} ACTIVE</span>
          </div>

          {sortedRooms.length === 0 ? (
            <div className={styles.emptyLobby}>
              <div className={styles.emptyIcon}>⚡</div>
              <p>NO PUBLIC ROOMS ACTIVE<br />CREATE ONE TO GET STARTED</p>
            </div>
          ) : (
            <div className={styles.roomList}>
              {sortedRooms.map((room) => (
                <button
                  key={room.id}
                  className={styles.roomCard}
                  onClick={() => onJoinRoom(room.id)}
                >
                  <div className={styles.roomInfo}>
                    <div className={styles.roomName}>
                      {room.name || `ROOM ${room.id}`}
                    </div>
                    <div className={styles.roomCode}>{room.id}</div>
                  </div>
                  <div className={styles.roomMeta}>
                    <div className={styles.memberCount}>
                      <IconUsers />
                      {room.memberCount || 0}
                    </div>
                    <span className={styles.joinArrow}><IconArrowRight /></span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Version footer */}
        <div className={styles.versionFooter}>
          ⚡ LIGHTNING LADDER &nbsp;·&nbsp; <strong>v3.0</strong>
        </div>
      </div>
    </div>
  )
}
