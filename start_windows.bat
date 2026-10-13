@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python environment...
  py -3 -m venv .venv
  if errorlevel 1 (echo Python 3.12 or newer was not found. Install Python and retry.& exit /b 1)
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
