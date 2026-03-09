import { useState, useCallback } from 'react'
import { ThemeToggle } from './ThemeToggle'
import styles from './RoomBar.module.css'

/* ── SVG Icons (stroke style, matching ThemeToggle) ── */
const IconArrowLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
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

export function RoomBar({ roomId, roomUrl, roomName, memberCount, remaining, isConnected, isConnecting, presenceReady, isOwner, theme, onThemeToggle, onLeave }) {
  const [copied, setCopied] = useState(null) // 'link' | 'code' | null

  const copyToClipboard = useCallback((text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }, [])

  const dotClass = isConnecting
    ? styles.dotConnecting
    : isConnected
    ? styles.dotLive
    : styles.dotOffline

  const statusText = isConnecting
    ? 'CONNECTING'
    : isConnected
    ? 'LIVE'
    : 'OFFLINE'

  return (
    <div className={styles.bar}>
      {/* Top row: back button, room title, share & theme */}
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
          <button className={styles.backBtn} onClick={onLeave} title="Back to lobby">
            <IconArrowLeft /> LOBBY
          </button>
          <div className={styles.sep} />
          <div className={styles.roomTitle}>
            <span className={styles.bolt}>⚡</span>
            {roomName ? (
              <span className={styles.roomNameBig}>{roomName}</span>
            ) : (
              <span className={styles.roomNameBig}>ROOM {roomId}</span>
            )}
          </div>
        </div>
        <div className={styles.topRight}>
          <button
            className={`${styles.shareBtn} ${copied === 'code' ? styles.shareCopied : ''}`}
            onClick={() => copyToClipboard(roomId, 'code')}
            title="Copy room code"
          >
            {copied === 'code' ? <><IconCheck /> COPIED</> : <><IconCopy /> CODE</>}
          </button>
          <button
            className={`${styles.shareBtn} ${copied === 'link' ? styles.shareCopied : ''}`}
            onClick={() => copyToClipboard(roomUrl, 'link')}
            title="Copy room link"
          >
            {copied === 'link' ? <><IconCheck /> COPIED</> : <><IconLink /> LINK</>}
          </button>
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        </div>
      </div>

      {/* Bottom row: status strip */}
      <div className={styles.statusStrip}>
        <div className={styles.statusLeft}>
          <div className={styles.statusItem}>
            <div className={`${styles.statusDot} ${dotClass}`} />
            <span>{statusText}</span>
          </div>
          <div className={styles.statusSep} />
          <div className={styles.statusItem}>
            <span className={styles.presenceDot} />
            {presenceReady ? (
              <span>{memberCount} CONNECTED</span>
            ) : (
              <span className={styles.shimmerInline}>—</span>
            )}
          </div>
          {isOwner && (
            <>
              <div className={styles.statusSep} />
              <div className={`${styles.statusItem} ${styles.ownerBadge}`}>
                <span>⚡ OWNER</span>
              </div>
            </>
          )}
          {roomName && (
            <>
              <div className={styles.statusSep} />
              <div className={styles.statusItem}>
                <span className={styles.statusCode}>CODE: {roomId}</span>
              </div>
            </>
          )}
        </div>
        <div className={styles.statusRight}>
          <div className={styles.remainingBadge}>
            {presenceReady ? (
              <span className={styles.remainingCount}>{remaining}</span>
            ) : (
              <span className={`${styles.remainingCount} ${styles.shimmerInline}`}>—</span>
            )}
            <span className={styles.remainingLabel}>REMAINING</span>
          </div>
        </div>
      </div>
    </div>
  )
}
