import { formatPrice, formatQty } from '@shared/lib'
import { Panel } from '@shared/ui'

import { usePaperTrading } from '../model/use-paper-trading'
import styles from './OpenOrders.module.css'

export function OpenOrders() {
  const { openOrders, cancel } = usePaperTrading()

  return (
    <Panel title="Open orders" hint={openOrders.length ? 'Cancel while waiting' : 'None working'}>
      <div className={styles.wrap}>
        {openOrders.length === 0 ? (
          <p className={styles.empty}>Submitted orders land here while the book is matching.</p>
        ) : (
          <ul className={styles.list}>
            {openOrders.map((order) => (
              <li key={order.id} className={styles.row}>
                <div>
                  <p className={styles.title}>
                    <span data-side={order.side}>{order.side}</span> {order.ticker}
                  </p>
                  <p className={styles.meta}>
                    {order.status} · {formatQty(order.qty)} @ {formatPrice(order.limit)}
                  </p>
                </div>
                <button type="button" className={styles.cancel} onClick={() => cancel(order.id)}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}
