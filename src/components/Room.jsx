import { useState, useCallback, useEffect, useRef } from 'react'
import { useAbly } from '../hooks/useAbly'
import { useToast } from '../hooks/useToast'
import { useRoomPresence } from '../hooks/useRoomPresence'
import { useLobby } from '../hooks/useLobby'
import { RoomBar } from './RoomBar'
import { JoinSection } from './JoinSection'
import { TimerPanel } from './TimerPanel'
import { RosterItem } from './RosterItem'
import { SharedNotes } from './SharedNotes'
import { Footer } from './Footer'
import { LeaveModal } from './LeaveModal'
import styles from '../App.module.css'

const INITIAL_STATE = {
  speakers: [],
  presentMins: 5,
  qaMins: 5,
  phase: 'present',
  timerRunning: false,
  activeStartedAt: null,
  pausedElapsed: 0,
  roomName: '',
}

export function Room({ roomId, roomUrl, roomConfig, userId, theme, onThemeToggle, onLeave }) {
  const [state, setState]           = useState(INITIAL_STATE)
  const [isConnected, setConnected] = useState(false)
  const [isConnecting, setConnecting] = useState(true)
  const [ready, setReady]           = useState(false)
  const { message: toastMsg, visible: toastVisible, showToast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notesUnread, setNotesUnread] = useState(false)
  const sidebarOpenRef = useRef(false)
  const { memberCount, isLastOne, presenceReady } = useRoomPresence({ roomId })
  const { publishRoomUpdate } = useLobby()
  const hasHadContentRef = useRef(false)
  const leaveWarningShownRef = useRef(false)
  const notesHaveContentRef = useRef(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)

  // Owner check: the user is the owner if they created this room
  const isOwner = !!(roomConfig?.ownerId && roomConfig.ownerId === userId)

  const handleNotesActivity = useCallback(() => {
    if (!sidebarOpenRef.current) setNotesUnread(true)
  }, [])

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev
      sidebarOpenRef.current = next
      if (next) setNotesUnread(false)
      return next
    })
  }, [])

  const publishRef = useRef(null)
  const dragRef = useRef(null)
  const publishedCleanRef = useRef(false)

  // When this is a brand-new room (isNew), wipe any stale Ably history by
  // immediately publishing a clean initial state once we're connected.
  useEffect(() => {
    if (!roomConfig?.isNew || !ready || publishedCleanRef.current || !publishRef.current) return
    publishedCleanRef.current = true
    const fresh = { ...INITIAL_STATE, roomName: roomConfig.name || '' }
    setState(fresh)
    publishRef.current(fresh)
  }, [ready]) // eslint-disable-line

  // Owner: ensure roomName is reflected in local state if it arrives via
  // roomConfig before the Ably rewind message is delivered.
  // NOTE: we deliberately do NOT publish here — the isNew effect handles the
  // initial publish, and any subsequent updateState call carries roomName.
  // Publishing here would overwrite the real persisted state with an empty
  // speakers list before Ably has had a chance to rewind it.
  useEffect(() => {
    if (!isOwner || !roomConfig?.name) return
    setState((prev) => {
      if (prev.roomName === roomConfig.name) return prev
      return { ...prev, roomName: roomConfig.name }
    })
  }, [isOwner, roomConfig?.name]) // eslint-disable-line

  // Track if room has had meaningful content (names added or notes typed)
  useEffect(() => {
    if (state.speakers.length > 0) {
      hasHadContentRef.current = true
    }
  }, [state.speakers.length])

  // Track notes content
  const setNotesHaveContent = useCallback((hasContent) => {
    notesHaveContentRef.current = hasContent
    if (hasContent) hasHadContentRef.current = true
  }, [])

  // Publish room presence updates to lobby if public,
  // and keep the listing alive with a periodic heartbeat.
  useEffect(() => {
    if (!roomConfig?.isPublic || !roomId) return

    const sendUpdate = () => {
      publishRoomUpdate({
        id: roomId,
        name: roomConfig.name || '',
        memberCount,
        isPublic: true,
      })
    }

    // Publish immediately on every memberCount change
    sendUpdate()

    // Re-publish every 60 s so the lobby's rewind buffer stays fresh
    // and the stale-room pruner doesn't remove this entry.
    const heartbeat = setInterval(sendUpdate, 60_000)
    return () => clearInterval(heartbeat)
  }, [memberCount, roomId, roomConfig, publishRoomUpdate])


  const handleLeave = useCallback(() => {
    // If this user is the last person, show a warning modal first
    if (isLastOne) {
      setShowLeaveModal(true)
      return
    }
    doLeave()
  }, [isLastOne]) // eslint-disable-line

  const doLeave = useCallback(() => {
    setShowLeaveModal(false)
    // If the room is empty (no content), remove it from the lobby immediately
    // so it doesn't linger for the full stale timeout.
    if (!hasHadContentRef.current && roomConfig?.isPublic) {
      publishRoomUpdate({ id: roomId, removed: true })
    }
    onLeave(isLastOne)
  }, [onLeave, roomId, roomConfig, publishRoomUpdate, isLastOne])

  // Sync state + publish to Ably
  const updateState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      setTimeout(() => publishRef.current?.(next), 0)
      return next
    })
  }, [])

  // Handle incoming remote state
  // messageTimestamp is the Ably server-side timestamp (ms since epoch).
  // We use it to re-anchor activeStartedAt to *this* device's local clock so
  // that clock skew between the publishing device and this one is cancelled out.
  const handleRemoteState = useCallback((remote, messageTimestamp) => {
    if (!remote || !remote.speakers) return
    let adjusted = remote
    if (remote.timerRunning && remote.activeStartedAt && messageTimestamp) {
      const elapsedAtDelivery = messageTimestamp - remote.activeStartedAt
      adjusted = { ...remote, activeStartedAt: Date.now() - elapsedAtDelivery }
    }
    setState(adjusted)
    if (!ready) setReady(true)
  }, [ready])

  const { publish } = useAbly({
    roomId,
    onStateUpdate: handleRemoteState,
    onConnected: () => { setConnected(true); setConnecting(false); setReady(true) },
    onDisconnected: () => { setConnected(false); setConnecting(false) },
  })

  useEffect(() => { publishRef.current = publish }, [publish])

  // Show app after either connection or 4s timeout
  useEffect(() => {
    const t = setTimeout(() => { setReady(true); setConnecting(false) }, 4000)
    return () => clearTimeout(t)
  }, [])

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const active  = state.speakers.find((s) => s.status === 'present' || s.status === 'qa')
  const waiting = state.speakers.filter((s) => s.status === 'waiting')
  const done    = state.speakers.filter((s) => s.status === 'done')
  const allDone = state.speakers.length > 0 && waiting.length === 0 && !active

  // ── ACTIONS ────────────────────────────────────────────────────────────────
  const joinQueue = useCallback((name) => {
    updateState((prev) => {
      if (prev.speakers.find((s) => s.name.toLowerCase() === name.toLowerCase())) {
        showToast('Name already in queue')
        return prev
      }
      showToast(`${name} joined`)
      return {
        ...prev,
        speakers: [...prev.speakers, {
          id: Date.now() + '_' + Math.random().toString(36).slice(2),
          name,
          status: 'waiting',
          breakout: false,
        }],
      }
    })
  }, [updateState, showToast])

  const activateSpeaker = useCallback((idx) => {
    updateState((prev) => {
      const speakers = [...prev.speakers]
      speakers[idx] = { ...speakers[idx], status: 'present' }
      return { ...prev, speakers, phase: 'present', timerRunning: false, activeStartedAt: null, pausedElapsed: 0 }
    })
  }, [updateState])

  const startNextSpeaker = useCallback(() => {
    const idx = state.speakers.findIndex((s) => s.status === 'waiting')
    if (idx === -1) return
    activateSpeaker(idx)
  }, [state.speakers, activateSpeaker])

  const startTimer = useCallback(() => {
    updateState((prev) => {
      const offset = (prev.pausedElapsed || 0) * 1000
      return {
        ...prev,
        timerRunning: true,
        activeStartedAt: Date.now() - offset,
        pausedElapsed: 0,
      }
    })
  }, [updateState])

  const pauseTimer = useCallback(() => {
    updateState((prev) => {
      if (!prev.timerRunning || !prev.activeStartedAt) return prev
      const elapsed = Math.floor((Date.now() - prev.activeStartedAt) / 1000)
      return {
        ...prev,
        timerRunning: false,
        activeStartedAt: null,
        pausedElapsed: elapsed,
      }
    })
  }, [updateState])

  const goToQA = useCallback(() => {
    updateState((prev) => {
      const speakers = prev.speakers.map((s) =>
        s.status === 'present' ? { ...s, status: 'qa', breakout: false } : s
      )
      return { ...prev, speakers, phase: 'qa', timerRunning: true, activeStartedAt: Date.now(), pausedElapsed: 0 }
    })
  }, [updateState])

  const markDone = useCallback(() => {
    updateState((prev) => {
      const speakers = prev.speakers.map((s) =>
        (s.status === 'present' || s.status === 'qa') ? { ...s, status: 'done' } : s
      )
      const nextIdx = speakers.findIndex((s) => s.status === 'waiting')
      if (nextIdx !== -1) {
        speakers[nextIdx] = { ...speakers[nextIdx], status: 'present' }
      }
      return {
        ...prev,
        speakers,
        phase: 'present',
        timerRunning: false,
        activeStartedAt: null,
        pausedElapsed: 0,
      }
    })
  }, [updateState])

  const handleExpired = useCallback(() => {
    updateState((prev) => {
      const speakers = prev.speakers.map((s) =>
        (s.status === 'present' || s.status === 'qa') && !s.breakout
          ? { ...s, breakout: true }
          : s
      )
      showToast('⚠ TIME UP — BREAKOUT ROOM RECOMMENDED')
      return { ...prev, speakers }
    })
  }, [updateState, showToast])

  const deleteSpeaker = useCallback((id) => {
    updateState((prev) => ({ ...prev, speakers: prev.speakers.filter((s) => s.id !== id) }))
  }, [updateState])

  const moveSpeaker = useCallback((id, dir) => {
    updateState((prev) => {
      const arr = [...prev.speakers]
      const i   = arr.findIndex((s) => s.id === id)
      const t   = i + dir
      if (i === -1 || t < 0 || t >= arr.length) return prev;
      [arr[i], arr[t]] = [arr[t], arr[i]]
      return { ...prev, speakers: arr }
    })
  }, [updateState])

  const handleDragStart = useCallback((id) => {
    dragRef.current = id
  }, [])

  const handleDragEnter = useCallback((targetId) => {
    const draggedId = dragRef.current
    if (!draggedId || draggedId === targetId) return
    setState((prev) => {
      const arr = [...prev.speakers]
      const fromIdx = arr.findIndex((s) => s.id === draggedId)
      const toIdx = arr.findIndex((s) => s.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return prev
      const [moved] = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, moved)
      return { ...prev, speakers: arr }
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    if (!dragRef.current) return
    dragRef.current = null
    setState((prev) => {
      setTimeout(() => publishRef.current?.(prev), 0)
      return prev
    })
  }, [])

  const renameSpeaker = useCallback((id, name) => {
    updateState((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) => s.id === id ? { ...s, name } : s),
    }))
  }, [updateState])

  const resetSession = useCallback(() => {
    if (!confirm('Reset entire session? This clears all speakers.')) return
    updateState((prev) => ({
      ...INITIAL_STATE,
      presentMins: prev.presentMins,
      qaMins: prev.qaMins,
    }))
  }, [updateState])

  // ── RENDER ─────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="conn-overlay">
        <div className="spin" />
        <div className="conn-title">⚡ LIGHTNING LADDER</div>
        <p>JOINING ROOM {roomId}</p>
      </div>
    )
  }

  return (
    <div className={styles.shell}>
      {/* Desktop sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.sidebarCollapsed}`}>
        <SharedNotes sidebarMode onRemoteActivity={handleNotesActivity} roomId={roomId} onContentChange={setNotesHaveContent} />
        <button
          className={styles.sidebarTab}
          onClick={handleSidebarToggle}
          title={sidebarOpen ? 'Collapse notes' : 'Expand notes'}
        >
          <span className={styles.sidebarTabIcon}>{sidebarOpen ? '◂' : '▸'}</span>
          {!sidebarOpen && <span className={styles.sidebarTabText}>NOTES</span>}
          {!sidebarOpen && notesUnread && <span className={styles.unreadDot} />}
        </button>
      </aside>

      <div className={styles.app}>
        <RoomBar
          roomId={roomId}
          roomUrl={roomUrl}
          roomName={state.roomName || roomConfig?.name || ''}
          memberCount={memberCount}
          remaining={waiting.length + (active ? 1 : 0)}
          isConnected={isConnected}
          isConnecting={isConnecting}
          presenceReady={presenceReady}
          isOwner={isOwner}
          theme={theme}
          onThemeToggle={onThemeToggle}
          onLeave={handleLeave}
        />

        {active && (
          <TimerPanel
            state={state}
            onStart={startTimer}
            onPause={pauseTimer}
            onNextPhase={goToQA}
            onDone={markDone}
            onExpired={handleExpired}
          />
        )}

        <JoinSection
          presentMins={state.presentMins}
          qaMins={state.qaMins}
          onJoin={joinQueue}
          onChangePresentMins={(v) => updateState((p) => ({ ...p, presentMins: v }))}
          onChangeQaMins={(v) => updateState((p) => ({ ...p, qaMins: v }))}
        />

        {/* Roster */}
        <div className={styles.rosterHeader}>
          <div className={styles.rosterTitle}>// SPEAKER QUEUE</div>
          {state.speakers.length > 0 && (
            <button className="btn btn-ghost" style={{ fontSize: '9px', padding: '5px 12px' }} onClick={resetSession}>
              RESET SESSION
            </button>
          )}
        </div>

        {/* Start next */}
        {!active && waiting.length > 0 && (
          <div className={styles.startNextArea}>
            <button className="btn btn-amber" onClick={startNextSpeaker}>
              {done.length === 0 ? '▶ START SESSION' : '▶ START NEXT SPEAKER'}
            </button>
          </div>
        )}

        <div className={styles.rosterList}>
          {state.speakers.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>⚡</div>
              <p>NO SPEAKERS QUEUED<br />ENTER YOUR NAME ABOVE TO JOIN</p>
            </div>
          ) : (
            state.speakers.map((s, i) => (
              <RosterItem
                key={s.id}
                speaker={s}
                index={i}
                total={state.speakers.length}
                onDelete={deleteSpeaker}
                onMove={moveSpeaker}
                onRename={renameSpeaker}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>

        {/* Mobile shared notes (collapsible) */}
        <div className={styles.mobileNotes}>
          <SharedNotes roomId={roomId} onContentChange={setNotesHaveContent} />
        </div>

        {/* Session complete */}
        {allDone && (
          <div className={styles.sessionComplete}>
            <h2>SESSION COMPLETE</h2>
            <p>ALL SPEAKERS DONE // SHIP IT</p>
          </div>
        )}

        <Footer isConnected={isConnected} isConnecting={isConnecting} />

        {/* Toast */}
        <div className={`toast ${toastVisible ? 'show' : ''}`}>{toastMsg}</div>
      </div>

      {/* Last-person leave warning modal */}
      {showLeaveModal && (
        <LeaveModal
          onStay={() => setShowLeaveModal(false)}
          onLeave={doLeave}
        />
      )}
    </div>
  )
}
