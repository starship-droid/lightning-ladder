import styles from './Header.module.css'

export function Header({ speakerCount, remaining, isConnected, isConnecting }) {
  const dotClass = isConnecting
    ? styles.dotConnecting
    : isConnected
    ? styles.dotLive
    : styles.dotOffline

  const statusText = isConnecting
    ? 'CONNECTING...'
    : isConnected
    ? `${speakerCount} IN QUEUE`
    : `${speakerCount} IN QUEUE (OFFLINE)`

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.sub}>// AGENDA TIMER</div>
        <div className={styles.logoRow}>
          <span className={styles.bolt}>⚡</span>
          <h1 className={styles.title}>
            LIGHTNING <em>LADDER</em>
          </h1>
        </div>
        <div className={styles.statusDot}>
          <div className={`${styles.dot} ${dotClass}`} />
          <span>{statusText}</span>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.count}>{remaining}</div>
        <div className={styles.countLabel}>REMAINING</div>
      </div>
    </header>
  )
}