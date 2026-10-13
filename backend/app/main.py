"""Local FastAPI service for voice recognition and robotic hand control."""
import asyncio
import json
import logging
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse

from .commands import match_command
from .config import ROOT, GESTURES_FILE, load_gestures, load_settings, save_gestures
from .schemas import CommandRequest, FingerRequest, GestureUpdate, ListenRequest, ModeRequest, SerialRequest
from .serial_controller import SerialController
from .simulator import HandSimulator
from .speech import SpeechService

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("hand")
settings = load_settings()
simulator = HandSimulator()
serial_device = SerialController()
mode = settings.get("mode", "simulator")
history = deque(maxlen=60)
clients: set[WebSocket] = set()
loop = None


async def publish(event):
    dead = []
    for client in list(clients):
        try:
            await client.send_json(event)
        except Exception:
            dead.append(client)
    for client in dead:
        clients.discard(client)


async def record_event(event):
    await publish(event)


async def execute_command(command: str, source: str = "voice", confidence=None, utterance=None):
    global mode
    gesture = next((g for g in load_gestures()["gestures"] if g["command"] == command), None)
    if not gesture:
        return None
    expected_fingers = {"thumb", "index", "middle", "ring", "pinky"}
    safe_min, safe_max = settings.get("safe_servo_degrees", [10, 170])
    pose = gesture.get("fingers", {})
    if set(pose) != expected_fingers or any(type(angle) is not int or angle < safe_min or angle > safe_max for angle in pose.values()):
        await publish({"type": "error", "message": f"Gesture {command} has invalid finger values; each finger must be between {safe_min}° and {safe_max}°."})
        return None
    try:
        if mode == "simulator":
            device_result = simulator.execute(gesture)
        else:
            serial_device.send_gesture(gesture)
            device_result = {"mode": "hardware", "command": command}
    except Exception as exc:
        await publish({"type": "error", "message": f"Command {command} could not be sent: {exc}"})
        return None
    item = {"id": f"{datetime.now(timezone.utc).timestamp():.6f}", "command": command,
            "name": gesture["name"], "source": source,
            "time": datetime.now(timezone.utc).isoformat(), "confidence": confidence,
            "result": "sent" if mode == "hardware" else "simulated", "text": utterance}
    history.appendleft(item)
    await publish({"type": "command.executed", "item": item, "device": device_result})
    await publish({"type": "status", "status": current_status()})
    return item


def speech_callback(event):
    if loop is None or loop.is_closed():
        return None
    if event["type"] == "speech.command":
        gesture_data = load_gestures()
        command, issue = match_command(event["text"], gesture_data)
        if issue:
            asyncio.run_coroutine_threadsafe(publish({"type": "command.unmatched", "text": event["text"], "reason": issue}), loop)
            return None
        if not command:
            asyncio.run_coroutine_threadsafe(publish({"type": "command.unmatched", "text": event["text"]}), loop)
            return None
        gesture = next((item for item in gesture_data["gestures"] if item["command"] == command), None)
        asyncio.run_coroutine_threadsafe(publish({
            "type": "command.matched", "text": event["text"],
            "command": command, "name": gesture["name"] if gesture else command,
        }), loop)
        return command
    if event["type"] == "speech.execute":
        asyncio.run_coroutine_threadsafe(execute_command(
            event["command"], "voice", event["confidence"], event.get("text")
        ), loop)
        return None
    asyncio.run_coroutine_threadsafe(publish(event), loop)
    return None


speech = SpeechService(speech_callback, settings)


def current_status():
    device = simulator.status() if mode == "simulator" else serial_device.status()
    return {"mode": mode, "device": device, "microphone": speech.status(),
            "model": {"available": Path(settings["model_path"]).is_dir(), "path": settings["model_path"]},
            "history_count": len(history)}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global loop
    loop = asyncio.get_running_loop()
    log.info("Robotic Hand API ready in %s mode", mode)
    yield
    speech.stop()
    serial_device.disconnect()


app = FastAPI(title="HandControl API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/", response_class=HTMLResponse)
def dashboard():
    """Serve a dependency-free dashboard when the optional Vite bundle is unavailable."""
    return FileResponse(ROOT / "backend" / "app" / "dashboard.html", media_type="text/html")


@app.get("/api/status")
def status():
    return current_status()


@app.get("/api/guide")
def project_guide():
    return FileResponse(ROOT / "README.md", media_type="text/markdown", filename="HandControl-README.md")


@app.get("/api/gestures")
def gestures():
    return load_gestures()


@app.put("/api/gestures/{command}")
def update_gesture(command: str, request: GestureUpdate):
    data = load_gestures()
    if request.command != command:
        raise HTTPException(400, "Path and gesture command must match")
    required_fingers = {"thumb", "index", "middle", "ring", "pinky"}
    if set(request.fingers) != required_fingers:
        raise HTTPException(422, "A gesture pose must define thumb, index, middle, ring, and pinky")
    if any(not phrase.strip() for phrase in request.phrases):
        raise HTTPException(422, "Gesture phrases must not be blank")
    safe = settings.get("safe_servo_degrees", [10, 170])
    if any(angle < safe[0] or angle > safe[1] for angle in request.fingers.values()):
        raise HTTPException(422, f"Finger positions must stay within the configured safe range {safe}")
    for index, gesture in enumerate(data["gestures"]):
        if gesture["command"] == command:
            data["gestures"][index] = request.model_dump()
            save_gestures(data)
            return data["gestures"][index]
    raise HTTPException(404, "Gesture not found")


@app.get("/api/audio/devices")
def audio_devices():
    try:
        return {"devices": SpeechService.devices(), "selected": settings.get("microphone_device")}
    except Exception as exc:
        return {"devices": [], "error": f"Cannot enumerate microphones: {exc}. Install sounddevice/PortAudio and check audio drivers."}


@app.post("/api/listening")
async def set_listening(request: ListenRequest):
    if not request.enabled:
        speech.stop()
        await publish({"type": "microphone.status", "microphone": speech.status()})
        return speech.status()
    try:
        speech.start(request.device if request.device is not None else settings.get("microphone_device"))
        await publish({"type": "microphone.status", "microphone": speech.status()})
        return speech.status()
    except Exception as exc:
        speech.error = str(exc)
        await publish({"type": "error", "message": speech.error})
        raise HTTPException(503, speech.error)


@app.get("/api/serial/ports")
def serial_ports():
    try:
        from serial.tools import list_ports
        return {"ports": [{"device": p.device, "description": p.description} for p in list_ports.comports()]}
    except Exception as exc:
        return {"ports": [], "error": f"Serial port discovery unavailable: {exc}"}


@app.post("/api/serial/connect")
async def connect_serial(request: SerialRequest):
    global mode
    try:
        await asyncio.to_thread(serial_device.connect, request.port, int(settings.get("baud_rate", 115200)))
        mode = "hardware"
        simulator.connected = False
        await publish({"type": "status", "status": current_status()})
        return current_status()
    except Exception as exc:
        raise HTTPException(503, f"Could not connect to {request.port}: {exc}")


@app.post("/api/serial/disconnect")
async def disconnect_serial():
    global mode
    serial_device.disconnect()
    mode = "simulator"
    simulator.connected = True
    await publish({"type": "status", "status": current_status()})
    return current_status()


@app.post("/api/mode")
async def set_mode(request: ModeRequest):
    global mode
    if request.mode == "hardware" and not serial_device.status()["connected"]:
        raise HTTPException(409, "Connect an ESP32 serial port before enabling hardware mode")
    if request.mode == "simulator":
        serial_device.disconnect()
        simulator.connected = True
    mode = request.mode
    await publish({"type": "status", "status": current_status()})
    return current_status()


@app.post("/api/commands")
async def send_command(request: CommandRequest):
    item = await execute_command(request.command, request.source)
    if not item:
        raise HTTPException(503, "Command was not executed; check device connection and selected mode")
    return item


@app.post("/api/calibration")
async def calibrate(request: FingerRequest):
    safe = settings.get("safe_servo_degrees", [10, 170])
    if request.angle < safe[0] or request.angle > safe[1]:
        raise HTTPException(422, f"Keep finger angle within safe range {safe[0]}–{safe[1]} degrees")
    try:
        if mode == "simulator":
            fingers = simulator.set_finger(request.finger, request.angle)
        else:
            serial_device.set_finger(request.finger, request.angle)
            fingers = {"updated": request.finger, "angle": request.angle}
        result = {"type": "calibration.updated", "finger": request.finger, "angle": request.angle, "fingers": fingers}
        await publish(result)
        return result
    except Exception as exc:
        raise HTTPException(503, f"Calibration command failed: {exc}")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    await websocket.send_json({"type": "status", "status": current_status()})
    await websocket.send_json({"type": "history", "items": list(history)})
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
