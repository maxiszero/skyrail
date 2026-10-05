@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install it from https://nodejs.org then reopen this launcher.
  pause
  exit /b 1
)
start "SKYRAIL server" /b node server.cjs
timeout /t 2 /nobreak >nul
start "SKYRAIL" http://127.0.0.1:4177
echo SKYRAIL is running. Keep this window open while playing.
pause
