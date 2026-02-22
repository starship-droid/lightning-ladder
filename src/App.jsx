import { useState, useCallback, useEffect, useRef } from 'react'
import { useAbly } from './hooks/useAbly'
import { useToast } from './hooks/useToast'
import { Header } from './components/Header'
import { JoinSection } from './components/JoinSection'
import { TimerPanel } from './components/TimerPanel'
import { RosterItem } from './components/RosterItem'
import { Footer } from './components/Footer'
import './index.css'
import styles from './App.module.css'

const INITIAL_STATE = {
  speakers: [],
  presentMins: 5,
  qaMins: 5,
  phase: 'present',
  timerRunning: false,
  activeStartedAt: null,
}

export default function App() {
  const [state, setState]           = useState(INITIAL_STATE)
  const [isConnected, setConnected] = useState(false)
  const [isConnecting, setConnecting] = useState(true)
  const [ready, setReady]           = useState(false)
  const { message: toastMsg, visible: toastVisible, showToast } = useToast()

  // We use a ref to publish so we always have the latest publish fn
  const publishRef = useRef(null)

  // Sync state + publish to Ably
  const updateState = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      // Schedule publish after render
      setTimeout(() => publishRef.current?.(next), 0)
      return next
    })
  }, [])

  // Handle incoming remote state
  const handleRemoteState = useCallback((remote) => {
    if (!remote || !remote.speakers) return
    setState(remote)
    if (!ready) setReady(true)
  }, [ready])

  const { publish } = useAbly({
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
      return { ...prev, speakers, phase: 'present', timerRunning: false, activeStartedAt: null }
    })
  }, [updateState])

  const startNextSpeaker = useCallback(() => {
    const idx = state.speakers.findIndex((s) => s.status === 'waiting')
    if (idx === -1) return
    activateSpeaker(idx)
  }, [state.speakers, activateSpeaker])

  const startTimer = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      timerRunning: true,
      activeStartedAt: Date.now(),
    }))
  }, [updateState])

  const goToQA = useCallback(() => {
    updateState((prev) => {
      const speakers = prev.speakers.map((s) =>
        s.status === 'present' ? { ...s, status: 'qa', breakout: false } : s
      )
      return { ...prev, speakers, phase: 'qa', timerRunning: false, activeStartedAt: null }
    })
  }, [updateState])

  const markDone = useCallback(() => {
    updateState((prev) => {
      const speakers = prev.speakers.map((s) =>
        (s.status === 'present' || s.status === 'qa') ? { ...s, status: 'done' } : s
      )
      return { ...prev, speakers, phase: 'present', timerRunning: false, activeStartedAt: null }
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
        <p>CONNECTING TO SYNC</p>
      </div>
    )
  }

  return (
    <div className={styles.app}>
      <Header
        speakerCount={state.speakers.length}
        remaining={waiting.length + (active ? 1 : 0)}
        isConnected={isConnected}
        isConnecting={isConnecting}
      />

      <JoinSection
        presentMins={state.presentMins}
        qaMins={state.qaMins}
        onJoin={joinQueue}
        onChangePresentMins={(v) => updateState((p) => ({ ...p, presentMins: v }))}
        onChangeQaMins={(v) => updateState((p) => ({ ...p, qaMins: v }))}
      />

      {active && (
        <TimerPanel
          state={state}
          onStart={startTimer}
          onNextPhase={goToQA}
          onDone={markDone}
          onExpired={handleExpired}
        />
      )}

      {/* Roster */}
      <div className={styles.rosterHeader}>
        <div className={styles.rosterTitle}>// SPEAKER QUEUE</div>
        {state.speakers.length > 0 && (
          <button className="btn btn-ghost" style={{ fontSize: '9px', padding: '5px 12px' }} onClick={resetSession}>
            RESET SESSION
          </button>
        )}
      </div>

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
            />
          ))
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
  )
}