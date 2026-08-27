import type { PropsWithChildren } from 'react'

import { cx } from '@shared/lib'

import styles from './Panel.module.css'

type PanelProps = PropsWithChildren<{
  className?: string
  title?: string
  hint?: string
}>

export function Panel({ className, title, hint, children }: PanelProps) {
  return (
    <section className={cx(styles.root, className)}>
      {(title || hint) && (
        <header className={styles.head}>
          {title ? <h2 className={styles.title}>{title}</h2> : null}
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </header>
      )}
      {children}
    </section>
  )
}
