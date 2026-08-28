import type { ReactNode } from 'react'

import { APP_KICKER, APP_NAME } from '@shared/config'

import styles from './AppHeader.module.css'

type LiveTone = 'live' | 'pending' | 'error'

type AppHeaderProps = {
  action?: ReactNode
  kicker?: string
  liveDetail?: string
  liveLabel?: string
  liveTone?: LiveTone
  nav?: ReactNode
  title?: string
}

export function AppHeader({
  action,
  kicker = APP_KICKER,
  liveDetail = '—',
  liveLabel = 'Idle',
  liveTone = 'pending',
  nav,
  title = APP_NAME,
}: AppHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden />
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h1 className={styles.title}>{title}</h1>
        </div>
      </div>
      <div className={styles.aside}>
        {nav}
        {action}
        <div className={styles.meta}>
          <span className={styles.live} data-tone={liveTone}>
            {liveLabel}
          </span>
          <span className={styles.liveDetail}>{liveDetail}</span>
        </div>
      </div>
    </header>
  )
}
