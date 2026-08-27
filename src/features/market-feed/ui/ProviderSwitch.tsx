import { cx } from '@shared/lib'

import { useMarketFeed } from '../model/use-market-feed'
import styles from './ProviderSwitch.module.css'

export function ProviderSwitch() {
  const { providerId, setProviderId, providers } = useMarketFeed()

  return (
    <div className={styles.root} role="tablist" aria-label="Market data provider">
      {providers.map((provider) => {
        const selected = provider.id === providerId

        return (
          <button
            key={provider.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cx(styles.tab, selected && styles.selected)}
            onClick={() => setProviderId(provider.id)}
          >
            <span className={styles.label}>{provider.label}</span>
            <span className={styles.hint}>{provider.hint}</span>
          </button>
        )
      })}
    </div>
  )
}
