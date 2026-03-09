import styles from './Footer.module.css'

const VERSION = 'v3.3'

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
        <a href="#" className={styles.footerLink}>⚡ LIGHTNING LADDER</a>
        &nbsp;·&nbsp; <strong>{VERSION}</strong>
        &nbsp;·&nbsp;
        <a
          href="https://github.com/starship-droid/lightning-ladder"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.footerLink}
        >
          GitHub ↗
        </a>
      </div>
      <div className={styles.syncStatus}>
        <div className={`${styles.syncDot} ${dotClass}`} />
        <span>{label}</span>
      </div>
    </footer>
  )
}