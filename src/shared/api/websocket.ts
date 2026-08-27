export type Unsubscribe = () => void

export type WsHeartbeat = {
  intervalMs: number
  ping: (socket: WebSocket) => void
  isPong: (payload: unknown) => boolean
}

const MAX_RETRY_MS = 16_000

export function openJsonWebSocket(
  url: string,
  handlers: {
    onOpen?: (socket: WebSocket) => void
    onMessage: (payload: unknown, socket: WebSocket) => void
    onRtt?: (ms: number) => void
    heartbeat?: WsHeartbeat
  },
): Unsubscribe {
  let disposed = false
  let attempt = 0
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let pingSentAt: number | null = null

  const stopHeartbeat = () => {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
    pingSentAt = null
  }

  const startHeartbeat = (target: WebSocket) => {
    const heartbeat = handlers.heartbeat
    if (!heartbeat) {
      return
    }

    stopHeartbeat()

    const ping = () => {
      if (target.readyState !== WebSocket.OPEN) {
        return
      }

      pingSentAt = performance.now()
      heartbeat.ping(target)
    }

    ping()
    heartbeatTimer = setInterval(ping, heartbeat.intervalMs)
  }

  const connect = () => {
    if (disposed) {
      return
    }

    const next = new WebSocket(url)
    socket = next

    const handleOpen = () => {
      attempt = 0
      handlers.onOpen?.(next)
      startHeartbeat(next)
    }

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as unknown

        if (handlers.heartbeat?.isPong(payload) && pingSentAt !== null) {
          handlers.onRtt?.(Math.max(0, Math.round(performance.now() - pingSentAt)))
          pingSentAt = null
          return
        }

        handlers.onMessage(payload, next)
      } catch {
        // ignore malformed frames
      }
    }

    const handleClose = () => {
      stopHeartbeat()
      next.removeEventListener('open', handleOpen)
      next.removeEventListener('message', handleMessage)
      next.removeEventListener('close', handleClose)

      if (disposed) {
        return
      }

      const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_MS)
      attempt += 1
      retryTimer = setTimeout(connect, delay)
    }

    next.addEventListener('open', handleOpen)
    next.addEventListener('message', handleMessage)
    next.addEventListener('close', handleClose)
  }

  connect()

  return () => {
    disposed = true
    clearTimeout(retryTimer)
    stopHeartbeat()
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close()
    }
  }
}
