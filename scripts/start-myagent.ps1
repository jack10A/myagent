$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "apps\api"
$webDir = Join-Path $root "apps\web"
$python = Join-Path $root ".venv\Scripts\python.exe"
$url = "http://localhost:3000"

Write-Host "Starting MyAgent API on http://localhost:8000..."
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd `"$apiDir`"; `"$python`" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

Write-Host "Starting MyAgent web app on http://localhost:3000..."
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd `"$webDir`"; npm.cmd run dev"
)

Start-Sleep -Seconds 3
Write-Host "Opening $url"
Start-Process $url

