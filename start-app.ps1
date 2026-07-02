# Temporary Invoicing App launcher
Set-Location $PSScriptRoot

# Refresh PATH so npm works in terminals opened before Node was installed
$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is not installed or not found." -ForegroundColor Red
  Write-Host "Install from https://nodejs.org/ then run this script again."
  Read-Host "Press Enter to exit"
  exit 1
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

Write-Host ""
Write-Host "Starting Temporary Invoicing App..." -ForegroundColor Green
Write-Host "Open http://localhost:5173 in your browser."
Write-Host "Do NOT open index.html directly."
Write-Host ""
Write-Host "Press Ctrl+C to stop the server."
Write-Host ""

Start-Process "http://localhost:5173"
npm run dev
