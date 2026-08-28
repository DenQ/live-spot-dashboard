import { NavLink } from 'react-router-dom'

import { routes } from '@shared/config'
import { cx } from '@shared/lib'

import styles from './ModeNav.module.css'

export function ModeNav() {
  return (
    <nav className={styles.root} aria-label="App mode">
      <NavLink to={routes.dashboard} className={({ isActive }) => cx(styles.link, isActive && styles.active)} end>
        Markets
      </NavLink>
      <NavLink to={routes.trainer} className={({ isActive }) => cx(styles.link, isActive && styles.active)}>
        Trainer
      </NavLink>
    </nav>
  )
}
