import { useState, useEffect, useRef, useCallback } from 'react'
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

const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
  </svg>
)

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const IconLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export function HomeScreen({ onCreateRoom, onJoinRoom, myRooms = [], onRemoveMyRoom, theme, onThemeToggle }) {
  const [input, setInput] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null) // { id, type: 'code'|'link' }
  const [confirmingId, setConfirmingId] = useState(null)
  const { publicRooms, lobbyReady } = useLobby()
  const inputRef = useRef(null)

  const handleCopy = useCallback((text, id, type) => {
    const write = () => { setCopied({ id, type }); setTimeout(() => setCopied(null), 2000) }
    navigator.clipboard.writeText(text).then(write).catch(() => {
      try {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      } catch {}
      write()
    })
  }, [])

  const getRoomUrl = (id) => `${window.location.origin}${window.location.pathname}#/room/${id}`

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

  // If the typed 6-char code matches a room the user owns, always treat it as
  // a join — even when Ably presence is 0 (everyone left but Ably still has
  // the last state in its rewind buffer).  Falling through to 'create' would
  // call handleCreateRoom with isNew:true and wipe the session for everyone.
  const savedRoom = is6Char ? myRooms.find((r) => r.id === cleaned) : null

  // Mode logic:
  //   empty                      → neutral
  //   6-char + checking          → checking (show spinner)
  //   6-char + exists or saved   → join
  //   anything else              → create
  const mode = isEmpty
    ? 'neutral'
    : is6Char && checking
      ? 'checking'
      : is6Char && (roomExists || savedRoom)
        ? 'join'
        : 'create'

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || mode === 'checking') return
    if (mode === 'join') {
      const publicMatch = publicRooms.find((r) => r.id === cleaned)
      if (publicMatch) {
        onJoinRoom(cleaned, { name: publicMatch.name, isPublic: true })
      } else if (savedRoom) {
        // Owner rejoining their own room (possibly with 0 active members)
        onJoinRoom(cleaned, { name: savedRoom.name, isPublic: savedRoom.isPublic, isOwner: true })
      } else {
        onJoinRoom(cleaned, {})
      }
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
              {mode === 'join' && savedRoom && !roomExists && (
                <span className={styles.hintJoin}>
                  YOUR ROOM — PRESS ENTER TO REJOIN
                </span>
              )}
              {mode === 'join' && roomExists && (
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

        {/* My Rooms */}
        {myRooms.length > 0 && (
          <div className={styles.myRooms}>
            <div className={styles.lobbyHeader}>
              <span className={styles.lobbyTitle}>// MY ROOMS</span>
              <span className={styles.lobbyCount}>{myRooms.length} SAVED</span>
            </div>
            <div className={styles.roomList}>
              {myRooms.map((room) => {
                const isConfirming = confirmingId === room.id
                const publicEntry = publicRooms.find((r) => r.id === room.id)
                const isOccupied = publicEntry && (publicEntry.memberCount || 0) > 0
                return (
                  <div key={room.id}>
                    <div className={`${styles.myRoomCard} ${isConfirming ? styles.myRoomCardConfirming : ''}`}>
                      <button
                        className={styles.myRoomMain}
                        onClick={() => onJoinRoom(room.id, { name: room.name, isPublic: room.isPublic, isOwner: true })}
                      >
                        <div className={styles.roomInfo}>
                          <div className={styles.roomName}>
                            {room.name || `ROOM ${room.id}`}
                          </div>
                          <div className={styles.roomCode}>
                            {room.id}
                            <span className={room.isPublic ? styles.badgePublic : styles.badgePrivate}>
                              {room.isPublic ? <><IconGlobe /> PUBLIC</> : <><IconLock /> PRIVATE</>}
                            </span>
                          </div>
                        </div>
                        <div className={styles.roomMeta}>
                          <span className={styles.ownerTag}>OWNER</span>
                          <span className={styles.joinArrow}><IconArrowRight /></span>
                        </div>
                      </button>
                      <button
                        className={styles.myRoomAction}
                        onClick={(e) => { e.stopPropagation(); handleCopy(room.id, room.id, 'code') }}
                        title="Copy room code"
                      >
                        {copied?.id === room.id && copied?.type === 'code' ? <IconCheck /> : <IconCopy />}
                      </button>
                      <button
                        className={styles.myRoomAction}
                        onClick={(e) => { e.stopPropagation(); handleCopy(getRoomUrl(room.id), room.id, 'link') }}
                        title="Copy room link"
                      >
                        {copied?.id === room.id && copied?.type === 'link' ? <IconCheck /> : <IconLink />}
                      </button>
                      <button
                        className={`${styles.removeBtn} ${isConfirming ? styles.removeBtnActive : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmingId(isConfirming ? null : room.id)
                        }}
                        title={isConfirming ? 'Cancel' : 'Delete room'}
                      >
                        <IconTrash />
                      </button>
                    </div>
                    {isConfirming && (
                      <div className={styles.confirmBar}>
                        {isOccupied ? (
                          <span className={styles.confirmBlocked}>
                            ⚠ {publicEntry.memberCount} PEOPLE ARE ACTIVE — CANNOT DELETE
                          </span>
                        ) : (
                          <>
                            <span className={styles.confirmText}>REMOVE THIS ROOM FROM YOUR LIST?</span>
                            <button
                              className={styles.confirmYes}
                              onClick={() => { onRemoveMyRoom(room.id); setConfirmingId(null) }}
                            >
                              CONFIRM
                            </button>
                          </>
                        )}
                        <button className={styles.confirmNo} onClick={() => setConfirmingId(null)}>
                          CANCEL
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Public rooms lobby */}
        <div className={styles.lobby}>
          <div className={styles.lobbyHeader}>
            <span className={styles.lobbyTitle}>// PUBLIC ROOMS</span>
            {lobbyReady ? (
              <span className={styles.lobbyCount}>{sortedRooms.length} ACTIVE</span>
            ) : (
              <span className={`${styles.lobbyCount} ${styles.shimmerText}`}>— LOADING</span>
            )}
          </div>

          {!lobbyReady ? (
            /* Skeleton placeholder cards while Ably channel is attaching */
            <div className={styles.roomList}>
              {[1, 2, 3].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonInfo}>
                    <div className={`${styles.skeletonBar} ${styles.skeletonBarWide}`} />
                    <div className={styles.skeletonBar} />
                  </div>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarCircle}`} />
                </div>
              ))}
            </div>
          ) : sortedRooms.length === 0 ? (
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
                  onClick={() => onJoinRoom(room.id, { name: room.name, isPublic: true })}
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
          <a href="#" className={styles.lobbyLink}>⚡ LIGHTNING LADDER</a>
          &nbsp;·&nbsp; <strong>v3.3</strong>
          &nbsp;·&nbsp;
          <a
            href="https://github.com/starship-droid/lightning-ladder"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
          >
            GitHub ↗
          </a>
        </div>
      </div>
    </div>
  )
}
