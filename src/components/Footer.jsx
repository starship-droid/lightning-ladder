import styles from './Footer.module.css'

const VERSION = 'v1.2'

export function Footer({ isConnected, isConnecting }) {
  const dotClass = isConnecting
    ? styles.dotConnecting
    : isConnected
    ? styles.dotLive
    : styles.dotOffline

  const label = isConnecting ? 'CONNECTING' : isConnected ? 'LIVE SYNC' : 'OFFLINE'

  return (
    <footer className={styles.footer}>
      <div className={styles.versionTag}>
        ⚡ LIGHTNING LADDER &nbsp;·&nbsp; <strong>{VERSION}</strong>
      </div>
      <div className={styles.syncStatus}>
        <div className={`${styles.syncDot} ${dotClass}`} />
        <span>{label}</span>
      </div>
    </footer>
  )
}