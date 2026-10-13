export type Gesture = { name: string; command: string; description: string; phrases: string[]; fingers: Record<string, number> }
export type DeviceStatus = { connected: boolean; mode: string; port?: string; fingers?: Record<string, number> }
export type Status = { mode: 'simulator' | 'hardware'; device: DeviceStatus; microphone: { active: boolean; device?: number | null; error?: string | null }; model: { available: boolean; path: string }; history_count: number }
export type HistoryItem = { id: string; command: string; name: string; source: string; time: string; confidence?: number | null; result: string }
