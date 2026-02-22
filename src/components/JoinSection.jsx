import { useState } from 'react'
import styles from './JoinSection.module.css'

function TimerStepper({ value, onInc, onDec }) {
  return (
    <div className={styles.stepper}>
      <button className={styles.stepBtn} onClick={onDec}>−</button>
      <div className={styles.stepVal}>{value}</div>
      <button className={styles.stepBtn} onClick={onInc}>+</button>
    </div>
  )
}

export function JoinSection({ presentMins, qaMins, onJoin, onChangePresentMins, onChangeQaMins }) {
  const [name, setName] = useState('')

  const handleJoin = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onJoin(trimmed)
    setName('')
  }

  return (
    <div className={styles.section}>
      <div className={styles.label}>IDENTIFY</div>
      <div className={styles.joinRow}>
        <input
          className={styles.input}
          type="text"
          placeholder="enter your name to join the queue..."
          maxLength={32}
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button className="btn btn-amber" onClick={handleJoin}>JOIN</button>
      </div>
      <div className={styles.timerConfig}>
        <label className={styles.configLabel}>PRESENT TIME</label>
        <div className={styles.timerGroup}>
          <TimerStepper
            value={presentMins}
            onInc={() => onChangePresentMins(Math.min(presentMins + 1, 30))}
            onDec={() => onChangePresentMins(Math.max(presentMins - 1, 1))}
          />
          <label className={styles.configLabel}>MIN</label>
        </div>
        <span className={styles.sep}>//</span>
        <label className={styles.configLabel}>Q&amp;A TIME</label>
        <div className={styles.timerGroup}>
          <TimerStepper
            value={qaMins}
            onInc={() => onChangeQaMins(Math.min(qaMins + 1, 30))}
            onDec={() => onChangeQaMins(Math.max(qaMins - 1, 1))}
          />
          <label className={styles.configLabel}>MIN</label>
        </div>
      </div>
    </div>
  )
}