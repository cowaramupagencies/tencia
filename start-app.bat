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

echo.
echo Starting Temporary Invoicing App...
echo Open http://localhost:5173 in your browser.
echo Do NOT open index.html directly - use the link above.
echo.
echo Press Ctrl+C to stop the server.
echo.

start http://localhost:5173
call npm run dev
