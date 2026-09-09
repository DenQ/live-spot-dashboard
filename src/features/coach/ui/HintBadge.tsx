import { COACH_ACTION_LABEL, type CoachRowHint } from '../model/row-hint'
import styles from './HintBadge.module.css'

type HintBadgeProps = {
  hint: CoachRowHint
  showWant?: boolean
}

export function HintBadge({ hint, showWant = false }: HintBadgeProps) {
  const want = showWant ? hint.want : null

  return (
    <span className={styles.root} data-action={hint.action}>
      <span className={styles.action}>{COACH_ACTION_LABEL[hint.action]}</span>
      {want !== null ? <span className={styles.want}>{Math.round(want * 100)}%</span> : null}
    </span>
  )
}
