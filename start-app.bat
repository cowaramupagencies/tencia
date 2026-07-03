@echo off
title Temporary Invoicing App
cd /d "%~dp0"

REM Ensure Node.js is on PATH for this session
set "PATH=C:\Program Files\nodejs;%PATH%"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not found.
  echo Please install it from https://nodejs.org/ then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm install
)

REM Stop old copies of the app so the port stays consistent
echo Stopping any old copy of the app...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo Starting Temporary Invoicing App...
echo.
echo IMPORTANT: Wait for the message below, then open:
echo   http://localhost:5173
echo.
echo Do NOT open index.html directly.
echo Leave this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173
call npm run dev -- --port 5173 --strictPort
