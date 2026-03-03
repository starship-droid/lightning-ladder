import { useState, useEffect, useRef } from 'react'
import { useLobby } from '../hooks/useLobby'
import { useRoomLookup } from '../hooks/useRoomLookup'
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
  const [input, setInput] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')
  const { publicRooms } = useLobby()
  const inputRef = useRef(null)

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 3000)
      return () => clearTimeout(t)
    }
  }, [error])

  // Detect whether input looks like a 6-char room code
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  const is6Char = cleaned.length === 6 && input.trim().length === 6
  const isEmpty = input.trim().length === 0

  // Live-check Ably presence to see if a room with this code exists
  const { exists: roomExists, memberCount: lookupCount, checking } = useRoomLookup(input)

  // Mode logic:
  //   empty          → neutral
  //   6-char + exists → join
  //   6-char + checking → checking (show spinner)
  //   anything else   → create (including 6-char codes with no active room)
  const mode = isEmpty
    ? 'neutral'
    : is6Char && checking
      ? 'checking'
      : is6Char && roomExists
        ? 'join'
        : 'create'

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || mode === 'checking') return
    if (mode === 'join') {
      onJoinRoom(cleaned)
    } else {
      // For 6-char codes that don't match an existing room, create with that specific code
      onCreateRoom({ isPublic, name: trimmed, ...(is6Char ? { id: cleaned } : {}) })
    }
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

        {/* Unified smart box */}
        <div className={[
          styles.smartBox,
          mode === 'join' && styles.smartBoxJoin,
          mode === 'create' && styles.smartBoxCreate,
          mode === 'checking' && styles.smartBoxChecking,
        ].filter(Boolean).join(' ')}>
          <div className={styles.cardLabel}>
            {mode === 'join' ? 'JOIN ROOM' : mode === 'checking' ? 'CHECKING…' : mode === 'create' ? 'CREATE ROOM' : 'ENTER ROOM'}
          </div>
          <div className={styles.cardContent}>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={[
                  styles.smartInput,
                  (mode === 'join' || mode === 'checking') && styles.smartInputJoin,
                  mode === 'create' && styles.smartInputCreate,
                  error && styles.smartInputError,
                ].filter(Boolean).join(' ')}
                type="text"
                placeholder="paste a room code or type a name to create..."
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  setError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                className={`btn ${mode === 'join' ? 'btn-blue' : 'btn-amber'}`}
                disabled={isEmpty || mode === 'checking'}
                onClick={handleSubmit}
              >
                {mode === 'join' ? <>JOIN <IconArrowRight /></> : <>⚡ CREATE</>}
              </button>
            </div>

            {/* Hint text */}
            <div className={styles.hintRow}>
              {mode === 'checking' && (
                <span className={styles.hintChecking}>
                  <span className={styles.dot}>●</span> LOOKING UP ROOM…
                </span>
              )}
              {mode === 'join' && (
                <span className={styles.hintJoin}>
                  <IconUsers /> <strong>{lookupCount}</strong> ACTIVE — PRESS ENTER TO JOIN
                </span>
              )}
              {mode === 'create' && is6Char && (
                <span className={styles.hintCreate}>NO ROOM "{cleaned}" FOUND — THIS WILL CREATE IT</span>
              )}
              {mode === 'create' && !is6Char && (
                <span className={styles.hintCreate}>↵ THIS WILL CREATE A NEW ROOM</span>
              )}
              {mode === 'neutral' && (
                <span className={styles.hintNeutral}>TYPE A 6-CHARACTER CODE TO JOIN, OR A ROOM NAME TO CREATE</span>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {/* Create-mode options (visibility toggle) — slides in */}
            <div className={`${styles.createOptions} ${mode === 'create' ? styles.createOptionsVisible : ''}`}>
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
