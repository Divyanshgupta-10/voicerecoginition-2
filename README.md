# HandControl — Voice-controlled robotic hand

A local-first college MPMC project that recognizes a **small, predefined English command vocabulary** with offline Vosk and maps those commands to configurable example hand poses. It is not unrestricted speech-to-sign translation, and the sample poses are not a validated ISL dictionary. Tune each pose to your own hand and verify any sign with an ISL instructor before representing it as accurate.

The app has a React/Vite dashboard, FastAPI backend, safe simulator, optional USB serial transport, and ESP32 firmware for a PCA9685 servo driver. Simulator mode is the default. The application does not download a model automatically, and it never connects to hardware unless you choose a serial port.

## Project layout

```text
backend/app/             FastAPI, Vosk microphone worker, command mapping, serial and simulator
backend/tests/           Backend unit tests
frontend/                React + Vite + TypeScript + Tailwind dashboard
firmware/robotic_hand/   ESP32 Arduino firmware (PCA9685)
config/gestures.json     Phrases, command names, and five finger pose values
config/settings.example.json  Safe local defaults
models/                  Place the extracted Vosk model here
start_windows.bat        Install dependencies and open the dashboard on Windows
```

## Requirements

- Windows 10/11, Python 3.12 or newer (64-bit), and Node.js 22.12 or newer.
- A microphone for voice input. Without one, manual simulator commands work.
- The Vosk `vosk-model-small-en-us-0.15` model (downloaded manually below) for offline speech recognition.
- For physical use: ESP32, PCA9685 board at I2C address `0x40`, five servos, and a correctly powered/calibrated mechanism.

## Quick start on Windows

1. Install Python from [python.org](https://www.python.org/downloads/windows/) and Node.js from [nodejs.org](https://nodejs.org/). Restart VS Code/PowerShell after installing if `py` or `npm` is not found.
2. Download/extract the Vosk model using the steps below.
3. Double-click `start_windows.bat`. It creates `.venv`, installs Python and npm packages if needed, then opens the API and dashboard in two terminals.
4. Open **http://127.0.0.1:5173**. The API documentation is at **http://127.0.0.1:8000/docs**.

The first launch needs internet access to install packages. After the model and dependencies are installed, voice recognition itself runs offline. The dashboard loads local assets and does not require an internet connection.

### Manual startup

From the project root in PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
Push-Location frontend
npm install
Pop-Location
```

Then use two terminals:

```powershell
# Terminal 1
Set-Location backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
# Terminal 2 (from project root)
Set-Location frontend
npm run dev
```

### VS Code interpreter

Open the project root in VS Code, press **Ctrl+Shift+P**, choose **Python: Select Interpreter**, and select `.venv\Scripts\python.exe`. The frontend uses the Node runtime from your system PATH.

## Install the offline Vosk model

1. Open the official [Vosk models page](https://alphacephei.com/vosk/models).
2. Download the small English model named **vosk-model-small-en-us-0.15** (ZIP, roughly 40 MB; size may vary).
3. Extract it. Put the extracted model directory under the project’s `models` folder. The final path must be:

   ```text
   models\vosk-model-small-en-us-0.15\am
   ```

   Folders such as `am`, `conf`, and `graph` should be directly inside `vosk-model-small-en-us-0.15`, not in another same-named nested folder. To use another model location, set the `VOSK_MODEL_PATH` environment variable before starting the backend; `.env.example` shows the variable name. The app does not parse `.env` files automatically.

## Using the dashboard

- Start with **Simulator** mode. Pick a command tile and press **Try gesture**, or start the microphone and say a configured phrase such as “hello”, “please open hand”, or “stop”. Final Vosk results are matched; partial text is displayed only. Empty, unrelated, low-confidence, and ambiguous results do not execute a command.
- Use the **Gesture library** to inspect aliases. Edit `config/gestures.json` to adjust phrase aliases, command names, descriptions, and each command’s `thumb`, `index`, `middle`, `ring`, and `pinky` servo angles. Restart the backend after direct file edits.
- The **Finger calibration** sliders move individual fingers in simulator mode or send immediate test positions to hardware mode. **Apply to hand** applies each finger in sequence; **Save pose** updates the selected gesture in `config/gestures.json`. Keep the physical hand unloaded, clear, and at the configured safe range while testing.
- To connect hardware, connect the ESP32, choose its COM port, and press **Connect device**. Hardware mode sends a newline-terminated `POSE COMMAND thumb index middle ring pinky` line, so the configured gesture angles are used by the firmware. The serial protocol also accepts `SET FINGER ANGLE` for calibration. Disconnect returns the app to simulator mode.
- The **Command history** shows voice and manual commands, time, and recognition confidence. WebSocket events update the dashboard as they arrive.

## ESP32 and PCA9685 setup

1. In Arduino IDE, install the ESP32 board package and select your board/port.
2. Install **Adafruit PWM Servo Driver Library** (Library Manager). The library also uses Adafruit BusIO; Arduino IDE resolves that dependency.
3. Wire ESP32 SDA/SCL to the PCA9685 SDA/SCL (common ESP32 defaults: GPIO 21/22), connect grounds, and provide the servo supply separately as required by the servos. Do not power multiple servos from the ESP32 5V pin.
4. Upload `firmware/robotic_hand/robotic_hand.ino`. PCA9685 channels 0–4 map to thumb, index, middle, ring, pinky. Keep the I2C address at `0x40` or change the firmware.
5. Tune `SERVO_MIN_TICK`, `SERVO_MAX_TICK`, and the angle arrays for the actual servo, linkage, and tendon geometry. Begin with the hand unloaded and narrow the range if any tendon reaches a hard stop.
6. Connect the ESP32 serial monitor once to verify `READY HandControl PCA9685`, then close the monitor before connecting from the dashboard (only one program can own the COM port).

`STOP` maps to the configured open pose in the example firmware. This is not an emergency stop or a substitute for a physical power switch. Servo poses are written as positions; the firmware does not implement force sensing, obstruction detection, or a hardware emergency cutoff. Keep a readily accessible power disconnect during physical tests.

## Configuration and safety notes

- `config/settings.example.json` sets simulator mode, an example 0.35 average word-confidence threshold, 1.5 second duplicate cooldown, 115200 baud, and a 10°–170° servo test range. Settings may be copied to ignored `config/settings.json` for machine-specific changes.
- Vosk confidence is approximate. In the absence of word confidence data, the backend does not invent a score and treats the utterance confidence as 1.0; use the fixed command phrases carefully.
- The backend binds to `127.0.0.1`, intended for local use. There is no authentication; do not bind it to a public network without adding access controls.
- No automatic speech-model or firmware download/upload occurs.

## Tests

Run backend tests from the backend folder:

```powershell
..\.venv\Scripts\python.exe -m pytest -q
```

Build the frontend:

```powershell
Set-Location frontend
npm run build
```

## Troubleshooting

- **Model missing / microphone disabled:** `Model not installed` is a status indicator, not a claim of recognition. Check the exact model path above. Windows **Settings → Privacy & security → Microphone** must allow desktop applications; choose the correct input from the dashboard list.
- **No audio devices:** Install/reinstall the audio driver and the packages using `.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`. Restart the backend after package installation.
- **Port already in use:** Close an older backend/dev server or change the port in the start commands and Vite proxy.
- **Serial port busy / access denied:** Close Arduino Serial Monitor and other serial programs, verify the COM port in Device Manager, and reconnect the ESP32.
- **No servo response:** Check PCA9685 I2C wiring/address, common ground, separate servo power, firmware serial output, and channels 0–4. Adjust pulse endpoints carefully for your specific servo.
- **Wrong gesture/finger direction:** Servo conventions and tendon mechanics vary. Adjust the gesture pose values and firmware calibration with the mechanism disconnected or unloaded before fitting the hand.
