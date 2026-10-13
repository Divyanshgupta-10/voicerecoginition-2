@echo off
setlocal
cd /d "%~dp0"

rem Use a writable project-local temp folder. Some managed Windows environments
rem restrict the system temp folder used by Python's ensurepip bootstrap.
set "TEMP=%CD%\.runtime-tmp"
set "TMP=%TEMP%"
if not exist "%TEMP%" mkdir "%TEMP%"

py -3 -c "import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)"
if errorlevel 1 (
  echo Python 3.12 or newer was not found by the Python Launcher.
  echo Install 64-bit Python 3.12+ from https://www.python.org/downloads/windows/ and retry.
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python environment...
  py -3 -m venv --without-pip .venv
  if errorlevel 1 (
    echo Failed to create .venv. Check that Python 3.12+ is installed and the project folder is writable.
    exit /b 1
  )
)

".venv\Scripts\python.exe" -m pip --version >nul 2>&1
if errorlevel 1 (
  echo Setting up pip in the Python environment...
  ".venv\Scripts\python.exe" -m ensurepip --upgrade --default-pip
  if errorlevel 1 (
    echo Could not set up pip. The project-local temp folder is %TEMP%.
    echo Check folder permissions, then remove the incomplete .venv and retry.
    exit /b 1
  )
)

if not exist ".venv\Scripts\uvicorn.exe" (
  echo Installing backend packages...
  .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
  if errorlevel 1 exit /b 1
)
if not exist "frontend\node_modules" (
  echo Installing frontend packages...
  pushd frontend
  call npm install
  if errorlevel 1 (popd& exit /b 1)
  popd
)
start "HandControl API" cmd /k "cd /d ""%~dp0backend"" && ..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "HandControl Dashboard" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
echo Dashboard: http://127.0.0.1:5173
echo API docs:  http://127.0.0.1:8000/docs
endlocal
