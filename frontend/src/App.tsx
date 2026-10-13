import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Activity, AudioLines, BadgeCheck, Bell, Bluetooth, BookOpen, Check, ChevronDown, CircleHelp, Clock3, Fingerprint, Hand, Headphones, History, LayoutDashboard, Mic, MicOff, MoreHorizontal, Plug, Radio, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, TriangleAlert, Unplug, Volume2, Zap } from 'lucide-react'
import { api } from './services/api'
import { useRealtimeEvents } from './hooks/useRealtimeEvents'
import { StatusCards } from './components/StatusCards'
import type { Gesture, HistoryItem, Status } from './types'

const fingerOrder = ['thumb', 'index', 'middle', 'ring', 'pinky']
type RangeStyle = CSSProperties & { '--range': string }
const timeLabel = (time: string) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

function App() {
  const [status, setStatus] = useState<Status | null>(null)
  const [gestures, setGestures] = useState<Gesture[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [devices, setDevices] = useState<any[]>([])
  const [ports, setPorts] = useState<any[]>([])
  const [deviceId, setDeviceId] = useState<number | null>(null)
  const [port, setPort] = useState('')
  const [selected, setSelected] = useState('OPEN_HAND')
  const [listeningBusy, setListeningBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [transcript, setTranscript] = useState('Say a command to get started')
  const [partial, setPartial] = useState('')
  const [view, setView] = useState<'overview' | 'gestures'>('overview')
  const [query, setQuery] = useState('')
  const [calibration, setCalibration] = useState<Record<string, number>>({ thumb: 25, index: 25, middle: 25, ring: 25, pinky: 25 })
  const [saving, setSaving] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editPhrases, setEditPhrases] = useState('')

  const refresh = useCallback(async () => {
    try {
      const [s, g, m, p] = await Promise.all([api.status(), api.gestures(), api.microphones(), api.ports()])
      setStatus(s); setGestures(g.gestures); setDevices(m.devices ?? []); setPorts(p.ports ?? [])
      if (deviceId === null && m.selected !== null && m.selected !== undefined) setDeviceId(m.selected)
      if (!port && p.ports?.length) setPort(p.ports[0].device)
    } catch (e) { setError((e as Error).message) }
  }, [deviceId, port])

  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 7000); return () => window.clearInterval(timer) }, [refresh])
  const handleRealtimeEvent = useCallback((event: any) => {
    if (event.type === 'status') setStatus(event.status)
    if (event.type === 'history') setHistory(event.items ?? [])
    if (event.type === 'transcript.partial') setPartial(event.text)
    if (event.type === 'transcript.final') { setTranscript(event.text); setPartial('') }
    if (event.type === 'command.executed') {
      setHistory((items) => [event.item, ...items.filter((x) => x.id !== event.item.id)].slice(0, 30))
      setSelected(event.item.command)
      const pose = event.device?.fingers ?? gestures.find((gesture) => gesture.command === event.item.command)?.fingers
      if (pose) setCalibration((current) => ({ ...current, ...pose }))
    }
    if (event.type === 'command.unmatched') { setTranscript(event.text); setNotice(event.reason === 'ambiguous' ? 'Phrase matched more than one command' : 'No configured command matched') }
    if (event.type === 'microphone.status') setStatus((s) => s ? { ...s, microphone: event.microphone } : s)
    if (event.type === 'calibration.updated') setCalibration((s) => ({ ...s, [event.finger]: event.angle }))
    if (event.type === 'error') setError(event.message)
  }, [gestures])
  useRealtimeEvents(handleRealtimeEvent)

  const selectedGesture = gestures.find((g) => g.command === selected) ?? gestures[0]
  const filteredGestures = useMemo(() => gestures.filter((g) => `${g.name} ${g.command}`.toLowerCase().includes(query.toLowerCase())), [gestures, query])
  const run = async (task: () => Promise<any>, done?: string) => {
    setBusy(true); setError(''); setNotice('')
    try { await task(); if (done) setNotice(done); await refresh() }
    catch (e) { setError((e as Error).message) }
    finally { setBusy(false) }
  }
  const toggleListening = async () => {
    setListeningBusy(true); setError(''); setNotice('')
    try { const result = await api.listen(!status?.microphone.active, deviceId); setStatus((s) => s ? { ...s, microphone: result } : s); if (result.active) setNotice('Microphone is listening') }
    catch (e) { setError((e as Error).message); void refresh() }
    finally { setListeningBusy(false) }
  }
  const saveCalibration = async () => {
    if (!selectedGesture) return
    setSaving(true)
    try {
      for (const finger of fingerOrder) await api.calibrate(finger, calibration[finger])
      setNotice('Finger positions updated'); await refresh()
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }
  const savePoseToGesture = async () => {
    if (!selectedGesture) return
    setSaving(true)
    try {
      const updated = await api.updateGesture({ ...selectedGesture, fingers: { ...calibration } })
      setGestures((all) => all.map((g) => g.command === updated.command ? updated : g))
      setNotice(`${updated.name} pose saved to the gesture library`)
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }
  const editGesture = (gesture: Gesture) => {
    setSelected(gesture.command); setCalibration({ ...gesture.fingers }); setEditName(gesture.name); setEditDescription(gesture.description); setEditPhrases(gesture.phrases.join(', '))
  }
  const showGestureLibrary = () => { setView('gestures'); if (selectedGesture) editGesture(selectedGesture) }
  const saveGestureSettings = async () => {
    if (!selectedGesture) return
    setSaving(true)
    try {
      const updated = await api.updateGesture({ ...selectedGesture, name: editName.trim(), description: editDescription.trim(), phrases: editPhrases.split(',').map((p) => p.trim()).filter(Boolean) })
      setGestures((all) => all.map((g) => g.command === updated.command ? updated : g))
      setNotice(`${updated.name} settings saved`)
    } catch (e) { setError((e as Error).message) }
    finally { setSaving(false) }
  }
  const restorePose = () => setCalibration({ ...(selectedGesture?.fingers ?? {}) })
  const connectSerial = () => run(() => api.connect(port), `Connected to ${port}`)
  const gestureIcon = (command: string) => command === 'STOP' ? <ShieldCheck /> : command === 'HELP' ? <CircleHelp /> : command === 'THANK_YOU' ? <Sparkles /> : command === 'YES' || command === 'NO' ? <BadgeCheck /> : command === 'CLOSE_HAND' ? <Fingerprint /> : <Hand />

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Hand size={20} strokeWidth={2.3} /></div><span>hand<span className="brand-light">control</span></span><span className="brand-beta">LAB</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className={`nav-item ${view === 'overview' ? 'active' : ''}`} onClick={() => setView('overview')}><LayoutDashboard size={17} /> Overview <span className="nav-dot" /></button>
      <button className={`nav-item ${view === 'gestures' ? 'active' : ''}`} onClick={showGestureLibrary}><Hand size={17} /> Gesture library <span className="nav-count">{gestures.length}</span></button>
      <button className="nav-item" onClick={() => document.getElementById('calibration')?.scrollIntoView({ behavior: 'smooth' })}><SlidersHorizontal size={17} /> Calibration</button>
      <button className="nav-item" onClick={() => document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' })}><History size={17} /> Activity log</button>
      <div className="side-spacer" />
      <div className="sidebar-help"><div className="help-icon"><BookOpen size={17} /></div><strong>Building your hand?</strong><span>Review setup, wiring, and safety tips.</span><button onClick={() => window.open('/api/guide', '_blank')}>Open project guide <span>↗</span></button></div>
      <div className="profile"><div className="avatar">MP</div><div className="profile-copy"><b>MPMC project</b><span>Local workspace</span></div><MoreHorizontal size={18} className="muted" /></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>{view === 'overview' ? 'Overview' : 'Gesture library'}</b></div><div className="top-actions"><div className="server-state"><span className={`state-dot ${status ? 'online' : ''}`} /> API {status ? 'connected' : 'connecting'}</div><button className="icon-button" title="Refresh status" onClick={() => void refresh()}><RefreshCw size={17} /></button><button className="icon-button bell" title="Notifications"><Bell size={17} /><i /></button><div className="top-avatar">MP</div></div></header>
      <div className="content">
        <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> VOICE COMMAND STUDIO</div><h1>{view === 'overview' ? 'Good morning, maker.' : 'Gesture library'}</h1><p>{view === 'overview' ? 'Your hand is ready when you are. Let’s make it speak.' : 'Tune the command vocabulary and the pose each command performs.'}</p></div><div className="heading-date"><div className="date-icon"><Activity size={17} /></div><div><b>{status ? (status.model.available ? 'All systems ready' : 'Simulator ready') : 'Connecting…'}</b><span>Local dashboard</span></div><span className="pulse-ring" /></div></section>

        {error && <div className="alert error-alert"><TriangleAlert size={17} /><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
        {notice && <div className="alert success-alert"><Check size={17} /><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button></div>}

        <StatusCards status={status} commandCount={history.length}/>

        {view === 'gestures' ? <section className="library-section"><div className="section-head"><div><h2>Configured commands</h2><p>Phrase aliases execute the assigned example finger pose.</p></div><div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search gestures" /></div></div><div className="library-grid">{filteredGestures.map((g, i) => <button className={`library-card ${selected === g.command ? 'picked' : ''}`} key={g.command} onClick={() => editGesture(g)}><div className={`gesture-icon color-${i % 5}`}>{gestureIcon(g.command)}</div><div className="library-card-copy"><b>{g.name}</b><code>{g.command}</code><span>{g.phrases.join(' · ')}</span></div><ChevronDown size={16} className="library-chevron" /></button>)}</div>{selectedGesture && <div className="gesture-editor"><div><div className="panel-kicker">EDIT COMMAND</div><h2>{selectedGesture.name} <code>{selectedGesture.command}</code></h2><p>Change how the command appears and which spoken phrases match it.</p></div><div className="edit-fields"><label>Gesture name<input value={editName} onChange={(e) => setEditName(e.target.value)} /></label><label>Description<input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} /></label><label className="wide-field">Spoken phrases <small>Separate aliases with commas</small><input value={editPhrases} onChange={(e) => setEditPhrases(e.target.value)} /></label></div><button className="save-calibration editor-save" disabled={saving || !editName.trim() || !editPhrases.trim()} onClick={saveGestureSettings}>{saving ? <RefreshCw className="spin" size={14}/> : <Check size={14}/>} Save command settings</button></div>}</section> : <>
          <section className="work-grid">
            <div className="panel voice-panel"><div className="panel-heading"><div><div className="panel-kicker"><span className="live-mark" /> VOICE INPUT</div><h2>Speak a command</h2></div><button className="plain-icon" title="Voice settings"><Settings2 size={18} /></button></div>
              <div className={`voice-orb-wrap ${status?.microphone.active ? 'listening' : ''}`}><div className="orb-halo"/><div className="orb"><div className="orb-equalizer"><i/><i/><i/><i/><i/><i/><i/></div><Mic size={22} /></div><div className="sound-arc arc-one"/><div className="sound-arc arc-two"/></div>
              <div className="listen-copy"><b>{status?.microphone.active ? 'I’m listening' : 'Ready when you are'}</b><span>{status?.microphone.active ? 'Speak one of your configured phrases' : 'Start the microphone to speak a command'}</span></div>
              <button className={`listen-button ${status?.microphone.active ? 'stop-listen' : ''}`} onClick={toggleListening} disabled={listeningBusy}>{listeningBusy ? <RefreshCw className="spin" size={16} /> : status?.microphone.active ? <MicOff size={16} /> : <Mic size={16} />}{listeningBusy ? 'Connecting…' : status?.microphone.active ? 'Stop listening' : 'Start listening'}</button>
              <div className="audio-select"><Headphones size={15}/><select value={deviceId ?? ''} onChange={(e) => setDeviceId(e.target.value === '' ? null : Number(e.target.value))}><option value="">Default microphone</option>{devices.map((d) => <option value={d.id} key={d.id}>{d.name}</option>)}</select><ChevronDown size={14}/></div>
              <div className="transcript-box"><div className="transcript-label"><AudioLines size={14}/> LIVE TRANSCRIPT <span className={status?.microphone.active ? 'transcript-active' : ''}/></div><p>{partial || transcript}</p>{partial && <span className="partial-tag">PARTIAL</span>}</div>
              {!status?.model.available && <div className="model-tip"><TriangleAlert size={14}/><span>Install the Vosk model to enable the microphone. Simulator controls work without it.</span></div>}
            </div>

            <div className="panel hand-panel"><div className="panel-heading"><div><div className="panel-kicker"><span className="device-live"/> HAND PREVIEW</div><h2>Pose simulator</h2></div><div className="mode-pill"><span/> {status?.mode === 'hardware' ? 'HARDWARE' : 'SIMULATOR'} <ChevronDown size={13}/></div></div>
              <div className="hand-stage"><div className="stage-grid"/><div className="hand-glow"/><svg className="hand-illustration" viewBox="0 0 220 280" fill="none" aria-label="Robotic hand preview"><path d="M77 239c-9-1-15-8-17-18l-9-53c-2-12 15-17 20-5l9 20-10-76c-2-16 20-19 22-3l10 65-7-115c-1-17 22-18 23-1l5 110 4-99c1-16 23-16 23 1l-1 103 12-67c3-15 24-10 21 5l-13 99c-5 33-24 53-56 53H77Z" fill="url(#handFill)" stroke="#99e9d7" strokeWidth="3" strokeLinejoin="round"/><path d="m67 189 35 12m-29 10 31 10m-19-88 27-2m-25 21 29-2m-26-93 25 1m-23 18 23 1m-2 27 26 1m-25 20 27 2m-25 20 27 2m-2-72 27 2m-27 19 26 2m-27 20 26 2m-8 20 29 4" stroke="#0d332e" strokeWidth="5" strokeLinecap="round"/><defs><linearGradient id="handFill" x1="67" y1="22" x2="172" y2="254" gradientUnits="userSpaceOnUse"><stop stopColor="#83DCCB"/><stop offset="1" stopColor="#2C9B8F"/></linearGradient></defs></svg><div className="axis-label axis-top">SERVO POSITIONS <span>°</span></div><div className="finger-readouts">{fingerOrder.map((f) => <div key={f}><span>{f.slice(0, 3).toUpperCase()}</span><b>{Math.round(calibration[f] ?? 0)}°</b></div>)}</div><div className="stage-caption"><span className="stage-dot"/> {selectedGesture?.name ?? 'Open hand'} pose <span>·</span> {status?.mode === 'hardware' ? 'Live device' : 'Virtual preview'}</div></div>
              <div className="pose-footer"><div><span>ACTIVE GESTURE</span><b>{selectedGesture?.name ?? '—'} <code>{selectedGesture?.command}</code></b></div><button onClick={() => selectedGesture && run(() => api.execute(selectedGesture.command), `${selectedGesture.name} pose sent`)} disabled={busy || !selectedGesture}><Zap size={15}/> Try gesture</button></div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel commands-panel"><div className="section-head"><div><div className="panel-kicker">YOUR VOCABULARY</div><h2>Quick commands <span className="count-bubble">{gestures.length}</span></h2></div><button className="text-link" onClick={showGestureLibrary}>Manage gestures <span>↗</span></button></div><div className="command-grid">{gestures.slice(0, 8).map((g, i) => <button key={g.command} onClick={() => editGesture(g)} className={`command-tile ${selected === g.command ? 'selected' : ''}`}><span className={`tile-icon color-${i % 5}`}>{gestureIcon(g.command)}</span><span className="tile-copy"><b>{g.name}</b><small>{g.command.replace('_', ' ')}</small></span><span className="tile-arrow">↗</span></button>)}</div><div className="vocab-note"><Sparkles size={14}/> A fixed command vocabulary for predefined gesture poses. This is not unrestricted speech translation.</div></div>

              <div className="panel calibration-panel" id="calibration"><div className="section-head"><div><div className="panel-kicker">FINE TUNING</div><h2>Finger calibration</h2></div><button className="plain-icon" title="Reset to saved pose" onClick={restorePose}><RefreshCw size={16}/></button></div><div className="calibration-sub"><span>Adjust the {selectedGesture?.name ?? 'selected'} pose</span><span className="safe-chip"><ShieldCheck size={12}/> SAFE RANGE</span></div><div className="sliders">{fingerOrder.map((finger) => <div className="slider-row" key={finger}><span className="finger-name"><span className={`finger-glyph glyph-${finger}`}/>{finger}</span><input aria-label={`${finger} servo angle`} type="range" min="10" max="170" value={calibration[finger] ?? 25} style={{'--range': `${(((calibration[finger] ?? 25) - 10) / 160) * 100}%`} as RangeStyle} onChange={(e) => setCalibration((s) => ({ ...s, [finger]: Number(e.target.value) }))}/><span className="angle-value">{calibration[finger] ?? 25}°</span></div>)}</div><div className="calibration-actions"><button className="save-calibration" disabled={saving} onClick={saveCalibration}>{saving ? <RefreshCw className="spin" size={14}/> : <Zap size={14}/>} Apply to hand</button><button className="save-calibration save-pose" disabled={saving} onClick={savePoseToGesture}>{saving ? <RefreshCw className="spin" size={14}/> : <Check size={14}/>} Save pose</button></div><p className="safety-copy"><ShieldCheck size={13}/> Test in small increments; saved poses stay within 10°–170°.</p></div>
          </section>

          <section className="bottom-grid"><div className="panel serial-panel"><div className="section-head"><div><div className="panel-kicker">DEVICE CONNECTION</div><h2>Connect your hand</h2></div><div className={`connection-chip ${status?.mode === 'hardware' ? 'connected' : ''}`}><span/>{status?.mode === 'hardware' ? 'Connected' : 'Not connected'}</div></div><p className="serial-description">Connect the ESP32 over USB serial to send poses to the servos. Simulator mode is safe for trying the dashboard.</p><div className="serial-controls"><div className="select-shell"><Plug size={15}/><select value={port} onChange={(e) => setPort(e.target.value)}><option value="">Choose a serial port</option>{ports.map((p) => <option value={p.device} key={p.device}>{p.device} · {p.description}</option>)}</select><ChevronDown size={14}/></div><button className={status?.mode === 'hardware' ? 'disconnect-button' : 'connect-button'} disabled={busy || (!port && status?.mode !== 'hardware')} onClick={() => status?.mode === 'hardware' ? run(api.disconnect, 'Returned to simulator mode') : connectSerial()}>{status?.mode === 'hardware' ? <><Unplug size={15}/> Disconnect</> : <><Bluetooth size={15}/> Connect device</>}</button></div><div className="serial-foot"><span><Radio size={13}/> 115200 baud · newline protocol</span><button onClick={() => void refresh()}><RefreshCw size={12}/> Refresh ports</button></div><div className="hardware-warning"><TriangleAlert size={14}/><span>Hardware mode can move servos. Keep fingers clear and test with the hand unloaded first.</span></div></div>

            <div className="panel activity-panel" id="activity"><div className="section-head"><div><div className="panel-kicker">RECENT ACTIVITY</div><h2>Command history</h2></div><button className="plain-icon" title="History"><Clock3 size={16}/></button></div>{history.length ? <div className="history-list">{history.slice(0, 4).map((item) => <div className="history-item" key={item.id}><div className={`history-icon ${item.source === 'voice' ? 'voice-history' : ''}`}>{item.source === 'voice' ? <Volume2 size={14}/> : <Hand size={14}/>}</div><div className="history-copy"><b>{item.name}</b><span>{item.source === 'voice' ? `Voice · ${Math.round((item.confidence ?? 0) * 100)}% match` : 'Manual trigger'}</span></div><time>{timeLabel(item.time)}</time><span className="history-ok"><Check size={12}/></span></div>)}</div> : <div className="empty-history"><div className="empty-history-icon"><History size={19}/></div><b>No commands yet</b><span>Your recent commands will appear here.</span></div>}</div></section>
        </>}
        <footer className="footer"><span><span className="footer-dot"/> LOCAL & OFFLINE FIRST</span><span>Predefined ISL gesture examples · <button onClick={() => window.open('https://alphacephei.com/vosk/models', '_blank')}>Vosk speech recognition ↗</button></span></footer>
      </div>
    </main>
  </div>
}

export default App
