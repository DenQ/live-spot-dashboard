import { cx } from '@shared/lib'

import { useTheme } from '../model/use-theme'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className={styles.root} role="tablist" aria-label="Theme" data-testid="theme-toggle">
      <button
        type="button"
        role="tab"
        aria-label="Dark"
        aria-selected={theme === 'dark'}
        className={cx(styles.option, theme === 'dark' && styles.on)}
        onClick={() => setTheme('dark')}
      >
        <MoonIcon />
      </button>
      <button
        type="button"
        role="tab"
        aria-label="Light"
        aria-selected={theme === 'light'}
        className={cx(styles.option, theme === 'light' && styles.on)}
        onClick={() => setTheme('light')}
      >
        <SunIcon />
      </button>
    </div>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <path
        fill="currentColor"
        d="M13.4 10.2A6 6 0 0 1 5.8 2.6a6.2 6.2 0 1 0 7.6 7.6Z"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.3 3.3l1.1 1.1M11.6 11.6l1.1 1.1M3.3 12.7l1.1-1.1M11.6 4.4l1.1-1.1"
      />
    </svg>
  )
}
