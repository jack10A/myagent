$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $root "apps\web"
$url = "http://localhost:3000"

Write-Host "Starting MyAgent web app..."
Start-Process powershell -WindowStyle Hidden -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy",
  "Bypass",
  "-Command",
  "cd `"$webDir`"; npm.cmd run dev"
)

Start-Sleep -Seconds 2
Write-Host "Opening $url"
Start-Process $url

