import { useState, useEffect, useRef } from 'react'

export function useTimer({ state }) {
  const [secsLeft, setSecsLeft]   = useState(0)
  const [totalSecs, setTotalSecs] = useState(0)
  const intervalRef = useRef(null)

  const clearTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Sync timer whenever relevant state changes
  useEffect(() => {
    clearTimer()

    const active = state.speakers?.find(
      (s) => s.status === 'present' || s.status === 'qa'
    )

    if (!active || !state.timerRunning || !state.activeStartedAt) {
      // Not running — show static full duration
      const mins = state.phase === 'qa'
        ? (state.qaMins || 5)
        : (state.presentMins || 5)
      const total = mins * 60
      setTotalSecs(total)
      setSecsLeft(total)
      return
    }

    const mins    = state.phase === 'qa' ? (state.qaMins || 5) : (state.presentMins || 5)
    const total   = mins * 60
    const elapsed = Math.floor((Date.now() - state.activeStartedAt) / 1000)
    const remaining = Math.max(0, total - elapsed)

    setTotalSecs(total)
    setSecsLeft(remaining)

    if (remaining <= 0) return // already expired, parent handles

    intervalRef.current = setInterval(() => {
      setSecsLeft((prev) => {
        if (prev <= 1) {
          clearTimer()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clearTimer
  }, [
    state.timerRunning,
    state.activeStartedAt,
    state.phase,
    state.presentMins,
    state.qaMins,
    // Re-sync when active speaker changes
    state.speakers
      ?.find((s) => s.status === 'present' || s.status === 'qa')?.id,
  ])

  const pct = totalSecs > 0 ? (secsLeft / totalSecs) * 100 : 0
  const ratio = secsLeft / totalSecs

  const displayTime = (() => {
    const s = Math.max(0, secsLeft)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  })()

  const colorState = ratio <= 0
    ? 'danger'
    : ratio <= 0.25
    ? 'warning'
    : state.phase === 'qa'
    ? 'qa'
    : 'present'

  const isExpired = secsLeft === 0 && state.timerRunning

  return { secsLeft, totalSecs, pct, displayTime, colorState, isExpired }
}