$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$apiDir = Join-Path $root "apps\api"
$python = Join-Path $root ".venv\Scripts\python.exe"
$url = "http://localhost:8000/docs"

Write-Host "Starting MyAgent backend on http://localhost:8000..."
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd `"$apiDir`"; `"$python`" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

Start-Sleep -Seconds 2
Write-Host "Opening $url"
Start-Process $url

