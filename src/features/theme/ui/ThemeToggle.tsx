import { cx } from '@shared/lib'

import { useTheme } from '../model/use-theme'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const light = theme === 'light'

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        role="switch"
        aria-checked={light}
        aria-label="Theme"
        data-testid="theme-toggle"
        className={cx(styles.root, light && styles.on)}
        onClick={() => setTheme(light ? 'dark' : 'light')}
      >
        <span className={styles.label}>Theme</span>
        <span className={styles.hint}>{light ? 'Light' : 'Dark'}</span>
      </button>
    </div>
  )
}
