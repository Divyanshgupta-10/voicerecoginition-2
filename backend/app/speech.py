"""Vosk + sounddevice worker. Only complete utterances can trigger gestures."""
import json
import queue
import threading
import time


class SpeechService:
    def __init__(self, on_result, settings):
        self.on_result = on_result
        self.settings = settings
        self.stream = None
        self.worker = None
        self.stop_event = threading.Event()
        self.audio_queue = queue.Queue(maxsize=32)
        self.active = False
        self.error = None
        self.device = None

    @staticmethod
    def devices():
        import sounddevice as sd
        return [{"id": i, "name": d["name"], "channels": d["max_input_channels"]}
                for i, d in enumerate(sd.query_devices()) if d["max_input_channels"] > 0]

    def start(self, device=None):
        if self.active:
            return
        from pathlib import Path
        try:
            import sounddevice as sd
            from vosk import Model, KaldiRecognizer
        except ImportError as exc:
            raise RuntimeError(f"Missing speech package {exc.name}. Install backend requirements with: python -m pip install -r backend/requirements.txt") from exc

        model_path = Path(self.settings["model_path"])
        if not model_path.is_dir():
            raise FileNotFoundError(f"Vosk model not found: {model_path}. See README.md for download steps.")
        try:
            self.model = Model(str(model_path))
        except Exception as exc:
            raise RuntimeError(f"Could not load Vosk model at {model_path}: {exc}") from exc
        self.sample_rate = int(self.settings.get("sample_rate", 16000))
        self.recognizer = KaldiRecognizer(self.model, self.sample_rate)
        self.recognizer.SetWords(True)
        self.device = device
        self.stop_event.clear()
        while not self.audio_queue.empty():
            try:
                self.audio_queue.get_nowait()
            except queue.Empty:
                break

        def audio_callback(indata, frames, time_info, status):
            if status:
                self.error = str(status)
            try:
                self.audio_queue.put_nowait(bytes(indata))
            except queue.Full:
                self.error = "Audio buffer full; speech may be skipped."

        try:
            self.stream = sd.RawInputStream(samplerate=self.sample_rate, blocksize=4000,
                device=device, dtype="int16", channels=1, callback=audio_callback)
            self.stream.start()
        except Exception as exc:
            self.stream = None
            raise RuntimeError(f"Could not open microphone: {exc}. Check Windows microphone permissions and input device.") from exc
        self.active = True
        self.error = None
        self.worker = threading.Thread(target=self._consume, daemon=True)
        self.worker.start()

    def _consume(self):
        previous_command = None
        last_execution = 0.0
        cooldown = float(self.settings.get("command_cooldown_seconds", 1.5))
        while not self.stop_event.is_set():
            try:
                audio = self.audio_queue.get(timeout=0.25)
            except queue.Empty:
                continue
            try:
                if not self.recognizer.AcceptWaveform(audio):
                    partial = json.loads(self.recognizer.PartialResult()).get("partial", "")
                    if partial:
                        self.on_result({"type": "transcript.partial", "text": partial})
                    continue
                result = json.loads(self.recognizer.Result())
                text = result.get("text", "").strip()
                if not text:
                    continue
                words = result.get("result", [])
                confidence = sum(w.get("conf", 1.0) for w in words) / len(words) if words else 1.0
                now = time.monotonic()
                allowed = confidence >= float(self.settings.get("confidence_threshold", 0.35))
                duplicate = text == getattr(self, "last_text", None) and now - getattr(self, "last_text_at", 0) < cooldown
                self.last_text, self.last_text_at = text, now
                self.on_result({"type": "transcript.final", "text": text, "confidence": round(confidence, 3), "allowed": allowed, "duplicate": duplicate})
                if not allowed or duplicate:
                    continue
                command = self.on_result({"type": "speech.command", "text": text, "confidence": confidence})
                if command and (command != previous_command or now - last_execution >= cooldown):
                    previous_command, last_execution = command, now
                    self.on_result({"type": "speech.execute", "command": command, "text": text, "confidence": round(confidence, 3)})
            except Exception as exc:
                self.error = f"Speech recognition error: {exc}"
                self.on_result({"type": "error", "message": self.error})

    def stop(self):
        self.stop_event.set()
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None
        if self.worker and self.worker.is_alive():
            self.worker.join(timeout=1)
        self.active = False
        return self.status()

    def status(self):
        return {"active": self.active, "device": self.device, "error": self.error}
