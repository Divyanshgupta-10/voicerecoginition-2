import { useEffect, useRef } from 'react'

type RealtimeEvent = { type: string; [key: string]: any }

/** Keeps one reconnecting WebSocket open and forwards live backend events. */
export function useRealtimeEvents(onEvent: (event: RealtimeEvent) => void) {
  const handler = useRef(onEvent)
  useEffect(() => { handler.current = onEvent }, [onEvent])

  useEffect(() => {
    let socket: WebSocket | undefined
    let reconnectTimer: number | undefined
    let disposed = false
    const connect = () => {
      if (disposed) return
      socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`)
      socket.onmessage = (message) => {
        try { handler.current(JSON.parse(message.data)) }
        catch { /* Ignore a malformed event and keep the live connection. */ }
      }
      socket.onclose = () => { if (!disposed) reconnectTimer = window.setTimeout(connect, 1800) }
      socket.onerror = () => socket?.close()
    }
    connect()
    return () => { disposed = true; if (reconnectTimer) window.clearTimeout(reconnectTimer); socket?.close() }
  }, [])
}
