import styles from './LeaveModal.module.css'

export function LeaveModal({ onStay, onLeave }) {
  return (
    <div className={styles.backdrop} onClick={onStay}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.icon}>⚡</div>
        <div className={styles.title}>YOU'RE THE LAST ONE HERE</div>
        <p className={styles.body}>
          Once you leave, the room will be <strong>deleted in 5 minutes</strong> if
          no one returns.
        </p>
        <p className={styles.hint}>
          Make sure to save anything from the shared notes before you go.
        </p>
        <div className={styles.actions}>
          <button className={`btn btn-amber ${styles.stayBtn}`} onClick={onStay}>
            STAY IN ROOM
          </button>
          <button className={`btn btn-ghost ${styles.leaveBtn}`} onClick={onLeave}>
            LEAVE ANYWAY
          </button>
        </div>
      </div>
    </div>
  )
}
