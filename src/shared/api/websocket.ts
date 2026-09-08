export type Unsubscribe = () => void

export type WsConnectionState = 'connecting' | 'connected' | 'disconnected'

export type WsHeartbeat = {
  intervalMs: number
  pongTimeoutMs?: number
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
    onStateChange?: (state: WsConnectionState) => void
    heartbeat?: WsHeartbeat
    idleTimeoutMs?: number
  },
): Unsubscribe {
  let disposed = false
  let attempt = 0
  let immediateNext = false
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined
  let idleTimer: ReturnType<typeof setTimeout> | undefined
  let pongTimer: ReturnType<typeof setTimeout> | undefined
  let pingSentAt: number | null = null
  let lastMessageAt = 0

  const notifyState = (state: WsConnectionState) => {
    handlers.onStateChange?.(state)
  }

  const closeSocket = (target: WebSocket, code = 4000, reason = 'reconnect') => {
    if (target.readyState === WebSocket.OPEN || target.readyState === WebSocket.CONNECTING) {
      target.close(code, reason)
    }
  }

  const stopHeartbeat = () => {
    clearInterval(heartbeatTimer)
    heartbeatTimer = undefined
    clearTimeout(pongTimer)
    pongTimer = undefined
    pingSentAt = null
  }

  const stopIdleTimer = () => {
    clearTimeout(idleTimer)
    idleTimer = undefined
  }

  const resetIdleTimer = (target: WebSocket) => {
    stopIdleTimer()
    const idleTimeoutMs = handlers.idleTimeoutMs
    if (!idleTimeoutMs) {
      return
    }

    idleTimer = setTimeout(() => {
      closeSocket(target)
    }, idleTimeoutMs)
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

      if (heartbeat.pongTimeoutMs) {
        clearTimeout(pongTimer)
        pongTimer = setTimeout(() => {
          closeSocket(target)
        }, heartbeat.pongTimeoutMs)
      }
    }

    ping()
    heartbeatTimer = setInterval(ping, heartbeat.intervalMs)
  }

  const bumpActivity = (target: WebSocket) => {
    lastMessageAt = performance.now()
    resetIdleTimer(target)
  }

  const scheduleConnect = (delay: number) => {
    clearTimeout(retryTimer)
    retryTimer = setTimeout(connect, delay)
  }

  const forceReconnectIfStale = () => {
    if (disposed) {
      return
    }

    clearTimeout(retryTimer)

    const current = socket
    const idleTimeoutMs = handlers.idleTimeoutMs
    const isIdle =
      idleTimeoutMs !== undefined &&
      lastMessageAt > 0 &&
      performance.now() - lastMessageAt > idleTimeoutMs

    if (current?.readyState === WebSocket.OPEN && !isIdle) {
      return
    }

    attempt = 0
    immediateNext = true

    if (current && (current.readyState === WebSocket.OPEN || current.readyState === WebSocket.CONNECTING)) {
      closeSocket(current)
      return
    }

    connect()
  }

  const handleOnline = () => {
    forceReconnectIfStale()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      forceReconnectIfStale()
    }
  }

  window.addEventListener('online', handleOnline)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  const connect = () => {
    if (disposed) {
      return
    }

    notifyState('connecting')

    const next = new WebSocket(url)
    socket = next

    const handleOpen = () => {
      attempt = 0
      lastMessageAt = performance.now()
      notifyState('connected')
      handlers.onOpen?.(next)
      startHeartbeat(next)
      resetIdleTimer(next)
    }

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as unknown
        bumpActivity(next)

        if (handlers.heartbeat?.isPong(payload)) {
          clearTimeout(pongTimer)
          pongTimer = undefined
          if (pingSentAt !== null) {
            handlers.onRtt?.(Math.max(0, Math.round(performance.now() - pingSentAt)))
            pingSentAt = null
          }
          return
        }

        handlers.onMessage(payload, next)
      } catch {
        // ignore malformed frames
      }
    }

    const handleError = () => {
      closeSocket(next)
    }

    const handleClose = () => {
      if (socket !== next) {
        return
      }

      stopHeartbeat()
      stopIdleTimer()
      next.removeEventListener('open', handleOpen)
      next.removeEventListener('message', handleMessage)
      next.removeEventListener('error', handleError)
      next.removeEventListener('close', handleClose)

      if (disposed) {
        return
      }

      notifyState('disconnected')

      const delay = immediateNext ? 0 : Math.min(1000 * 2 ** attempt, MAX_RETRY_MS)
      immediateNext = false
      attempt += 1
      scheduleConnect(delay)
    }

    next.addEventListener('open', handleOpen)
    next.addEventListener('message', handleMessage)
    next.addEventListener('error', handleError)
    next.addEventListener('close', handleClose)
  }

  connect()

  return () => {
    disposed = true
    window.removeEventListener('online', handleOnline)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    clearTimeout(retryTimer)
    stopHeartbeat()
    stopIdleTimer()
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close()
    }
  }
}
