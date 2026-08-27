import type { PropsWithChildren } from 'react'

import styles from './PageShell.module.css'

export function PageShell({ children }: PropsWithChildren) {
  return (
    <div className={styles.root}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.grid} aria-hidden />
      <div className={styles.content}>{children}</div>
    </div>
  )
}
