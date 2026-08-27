export type Unsubscribe = () => void

const MAX_RETRY_MS = 16_000

export function openJsonWebSocket(
  url: string,
  handlers: {
    onOpen?: (socket: WebSocket) => void
    onMessage: (payload: unknown, socket: WebSocket) => void
  },
): Unsubscribe {
  let disposed = false
  let attempt = 0
  let socket: WebSocket | null = null
  let retryTimer: ReturnType<typeof setTimeout> | undefined

  const connect = () => {
    if (disposed) {
      return
    }

    const next = new WebSocket(url)
    socket = next

    const handleOpen = () => {
      attempt = 0
      handlers.onOpen?.(next)
    }

    const handleMessage = (event: MessageEvent<string>) => {
      try {
        handlers.onMessage(JSON.parse(event.data) as unknown, next)
      } catch {
        // ignore malformed frames
      }
    }

    const handleClose = () => {
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
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      socket.close()
    }
  }
}
