import { cx } from '@shared/lib'

import { useCoach } from '../model/use-coach'
import styles from './HintsToggle.module.css'

export function HintsToggle() {
  const { hintsEnabled, setHintsEnabled } = useCoach()

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={hintsEnabled}
        aria-label="Hints"
        data-testid="hints-toggle"
        className={cx(styles.root, hintsEnabled && styles.on)}
        onClick={() => setHintsEnabled(!hintsEnabled)}
      >
        <span className={styles.label}>Hints</span>
        <span className={styles.hint}>{hintsEnabled ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
