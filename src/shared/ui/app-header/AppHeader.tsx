import type { ReactNode } from 'react'

import { APP_KICKER, APP_NAME } from '@shared/config'

import styles from './AppHeader.module.css'

type LiveTone = 'live' | 'pending' | 'error'

type AppHeaderProps = {
  action?: ReactNode
  liveLabel?: string
  liveTone?: LiveTone
  liveDetail?: string
}

export function AppHeader({
  action,
  liveLabel = 'Idle',
  liveTone = 'pending',
  liveDetail = '—',
}: AppHeaderProps) {
  return (
    <header className={styles.root}>
      <div className={styles.brand}>
        <span className={styles.mark} aria-hidden />
        <div>
          <p className={styles.kicker}>{APP_KICKER}</p>
          <h1 className={styles.title}>{APP_NAME}</h1>
        </div>
      </div>
      <div className={styles.aside}>
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
