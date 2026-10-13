const API = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try { detail = (await response.json()).detail ?? detail } catch { /* server returned no JSON */ }
    throw new Error(detail)
  }
  return response.json()
}

export const api = {
  status: () => request<any>('/status'),
  gestures: () => request<any>('/gestures'),
  microphones: () => request<any>('/audio/devices'),
  ports: () => request<any>('/serial/ports'),
  listen: (enabled: boolean, device: number | null) => request<any>('/listening', { method: 'POST', body: JSON.stringify({ enabled, device }) }),
  connect: (port: string) => request<any>('/serial/connect', { method: 'POST', body: JSON.stringify({ port }) }),
  disconnect: () => request<any>('/serial/disconnect', { method: 'POST' }),
  execute: (command: string, source = 'manual') => request<any>('/commands', { method: 'POST', body: JSON.stringify({ command, source }) }),
  calibrate: (finger: string, angle: number) => request<any>('/calibration', { method: 'POST', body: JSON.stringify({ finger, angle }) }),
  updateGesture: (gesture: any) => request<any>(`/gestures/${gesture.command}`, { method: 'PUT', body: JSON.stringify(gesture) }),
}
