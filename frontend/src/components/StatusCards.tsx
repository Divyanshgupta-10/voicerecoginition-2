import { Command, Cpu, Mic, Waves, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Status } from '../types'

function StatusCard({ icon, tone, label, value, signal }: { icon: ReactNode; tone: string; label: string; value: ReactNode; signal: ReactNode }) {
  return <div className="status-card"><div className={`status-icon ${tone}`}>{icon}</div><div className="status-copy"><span>{label}</span><b>{value}</b></div>{signal}</div>
}

export function StatusCards({ status, commandCount }: { status: Status | null; commandCount: number }) {
  return <section className="status-row">
    <StatusCard icon={<Mic size={17}/>} tone="mic-icon" label="MICROPHONE" value={status?.microphone.active ? 'Listening' : 'Standby'} signal={<span className={`mini-indicator ${status?.microphone.active ? 'green' : ''}`}/>}/>
    <StatusCard icon={<Cpu size={17}/>} tone="device-icon" label="HAND DEVICE" value={status?.mode === 'hardware' ? (status.device.port || 'Connected') : 'Simulator mode'} signal={<span className={`mini-indicator ${status?.device.connected ? 'green' : ''}`}/>}/>
    <StatusCard icon={<Waves size={17}/>} tone="model-icon" label="SPEECH MODEL" value={status?.model.available ? 'Offline model ready' : 'Model not installed'} signal={<span className={`mini-indicator ${status?.model.available ? 'green' : 'amber'}`}/>}/>
    <StatusCard icon={<Command size={17}/>} tone="command-icon" label="COMMANDS TODAY" value={<>{commandCount} <small>executed</small></>} signal={<span className="status-trend"><Zap size={13}/> LIVE</span>}/>
  </section>
}
