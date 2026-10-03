import { useState } from 'react'
import styles from './RosterItem.module.css'

export function RosterItem({ speaker, index, total, onDelete, onMove, onRename, onDragStart, onDragEnter, onDragEnd }) {
  const [editing, setEditing]   = useState(false)
  const [editVal, setEditVal]   = useState(speaker.name)

  const isActive  = speaker.status === 'present' || speaker.status === 'qa'
  const canAct    = !isActive && speaker.status !== 'done'
  const canMove   = speaker.status !== 'done'

  const confirmEdit = () => {
    const trimmed = editVal.trim()
    if (trimmed && trimmed !== speaker.name) onRename(speaker.id, trimmed)
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditVal(speaker.name)
    setEditing(false)
  }

  const rowClass = [
    styles.item,
    speaker.status === 'waiting' ? styles.waiting  : '',
    speaker.status === 'present' ? styles.present  : '',
    speaker.status === 'qa'      ? styles.qa        : '',
    speaker.status === 'done'    ? styles.done      : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={rowClass}
      data-id={speaker.id}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => onDragEnter?.(speaker.id)}
    >
      <div className={styles.left}>
        <span
          className={`${styles.dragHandle} ${!canMove ? styles.dragDisabled : ''}`}
          draggable={canMove}
          onDragStart={(e) => {
            if (!canMove) { e.preventDefault(); return }
            e.dataTransfer.effectAllowed = 'move'
            const row = e.target.closest('[data-id]')
            if (row) e.dataTransfer.setDragImage(row, 0, 20)
            onDragStart?.(speaker.id)
          }}
          onDragEnd={() => onDragEnd?.()}
        >⠿</span>
        <span className={styles.num}>{String(index + 1).padStart(2, '0')}</span>

        {editing ? (
          <input
            className={styles.editInput}
            value={editVal}
            autoFocus
            maxLength={32}
            onChange={(e) => setEditVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  confirmEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
          />
        ) : (
          <span className={styles.name}>{speaker.name}</span>
        )}
      </div>

      <div className={styles.right}>
        {/* Badges */}
        <div className={styles.badges}>
          {speaker.status === 'present' && <span className="badge badge-presenting">PRESENTING</span>}
          {speaker.status === 'qa'      && <span className="badge badge-qa">Q&amp;A</span>}
          {speaker.status === 'done'    && <span className="badge badge-done">✓ DONE</span>}
          {speaker.status === 'waiting' && <span className="badge badge-waiting">WAITING</span>}
          {speaker.breakout             && <span className="badge badge-breakout">⚠ BREAKOUT</span>}
        </div>

        {/* Edit actions */}
        {editing ? (
          <div className={styles.editActions}>
            <button className="icon-btn" style={{ color: 'var(--green)', borderColor: 'var(--green)' }} onClick={confirmEdit}>✓</button>
            <button className="icon-btn" style={{ color: 'var(--red)', borderColor: 'var(--red)' }} onClick={cancelEdit}>✕</button>
          </div>
        ) : (
          <div className={styles.queueActions}>
            <button className="icon-btn" title="Move up"    disabled={!canMove || index === 0}         onClick={() => onMove(speaker.id, -1)}>↑</button>
            <button className="icon-btn" title={isActive ? 'Move back to queue' : 'Move down'} disabled={!canMove || index === total - 1} onClick={() => onMove(speaker.id, +1)}>↓</button>
            <button className="icon-btn" title="Edit name"  disabled={!canAct}                        onClick={() => { setEditVal(speaker.name); setEditing(true) }}>✎</button>
            <button className="icon-btn del" title="Remove" disabled={isActive}                       onClick={() => onDelete(speaker.id)}>✕</button>
          </div>
        )}
      </div>
    </div>
  )
}