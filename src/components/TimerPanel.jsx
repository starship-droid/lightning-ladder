import { useEffect } from 'react'
import { useTimer } from '../hooks/useTimer'
import styles from './TimerPanel.module.css'

export function TimerPanel({ state, onStart, onPause, onNextPhase, onDone, onExpired }) {
  const active = state.speakers?.find(
    (s) => s.status === 'present' || s.status === 'qa'
  )
  const done   = state.speakers?.filter((s) => s.status === 'done') || []
  const total  = state.speakers?.length || 0
  const phase  = active?.status || 'present' // 'present' | 'qa'

  const { displayTime, pct, colorState, isExpired } = useTimer({ state })

  // Notify parent when timer expires so it can mark breakout
  useEffect(() => {
    if (isExpired) onExpired?.()
  }, [isExpired]) // eslint-disable-line

  // Keep the tab title in sync with the live timer so users can glance at
  // other tabs (or the phone task-switcher) and still see how much time is left
  useEffect(() => {
    if (state.timerRunning && active) {
      const phase = active.status === 'qa' ? 'Q&A' : 'PRESENT'
      document.title = `${displayTime} ${phase} — ${active.name} · Lightning Ladder`
    } else {
      document.title = 'lightning-ladder'
    }
    return () => {
      document.title = 'lightning-ladder'
    }
  }, [displayTime, state.timerRunning, active])

  if (!active) return null

  const isRunning = state.timerRunning

  const timerClass = [
    styles.timerDisplay,
    colorState === 'danger'  ? styles.danger  : '',
    colorState === 'warning' ? styles.warning : '',
    colorState === 'qa'      ? styles.qaPhase : '',
  ].filter(Boolean).join(' ')

  const fillClass = [
    styles.progressFill,
    colorState === 'danger'  ? styles.danger  : '',
    colorState === 'warning' ? styles.warning : '',
    colorState === 'qa'      ? styles.qaPhase : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={styles.panel}>
      <div className={styles.sectionLabel}>ACTIVE SPEAKER</div>

      {/* Phase strip */}
      <div className={styles.phaseStrip}>
        <div className={`${styles.phasePill} ${phase === 'present' ? styles.curPresent : styles.donePhase}`}>
          <span className={styles.phaseDot} />
          PRESENT TIME
        </div>
        <div className={`${styles.phasePill} ${phase === 'qa' ? styles.curQa : ''}`}>
          <span className={styles.phaseDot} />
          Q&amp;A TIME
        </div>
      </div>

      {/* Breakout warning */}
      {active.breakout && (
        <div className={styles.breakoutWarning}>
          <span className={styles.warningIcon}>⚠</span>
          <span className={styles.warningText}>OVER TIME — BREAKOUT ROOM RECOMMENDED</span>
        </div>
      )}

      {/* Speaker name */}
      <div className={styles.speakerName}>
        <span className={styles.speakerIndex}>
          SPEAKER {done.length + 1} OF {total}
        </span>
        {active.name}
      </div>

      {/* Phase label */}
      <div className={`${styles.phaseLabel} ${phase === 'qa' ? styles.phaseLabelQa : styles.phaseLabelPresent}`}>
        {phase === 'qa' ? 'Q&A TIME' : 'PRESENT TIME'}
      </div>

      {/* Timer */}
      <div className={timerClass}>{displayTime}</div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={fillClass} style={{ width: `${pct}%` }} />
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {isRunning && (
          <button className="btn btn-ghost" onClick={onPause}>⏸ PAUSE</button>
        )}
        {!isRunning && (state.pausedElapsed > 0) && (
          <button className="btn btn-amber" onClick={onStart}>▶ RESUME</button>
        )}
        {!isRunning && !(state.pausedElapsed > 0) && phase === 'present' && (
          <button className="btn btn-amber" onClick={onStart}>▶ START PRESENT</button>
        )}
        {!isRunning && !(state.pausedElapsed > 0) && phase === 'qa' && (
          <button className="btn btn-blue" onClick={onStart}>▶ START Q&amp;A</button>
        )}
        {phase === 'present' && (
          <button className="btn btn-blue" onClick={onNextPhase}>→ {isRunning ? 'END PRESENT / START' : 'SKIP TO'} Q&amp;A</button>
        )}
        {phase === 'qa' && (
          <button className="btn btn-green" onClick={onDone}>✓ DONE</button>
        )}
      </div>
    </div>
  )
}