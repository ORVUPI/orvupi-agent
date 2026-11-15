# Arranca ARQIVEN en este equipo. No abre el puerto 11434 ni crea un tunel.
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1
# Con navegador: powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1 -Abrir
param([switch]$Abrir)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Falta Node.js 22 LTS o superior. Instala el instalador de Windows desde https://nodejs.org/ y abre PowerShell de nuevo. No hace falta Git ni Python."
}

$raw = & node -p "process.versions.node"
$major = [int]($raw.Split(".")[0])
if ($major -lt 22) {
  Write-Error "Node $raw es demasiado antiguo. Hace falta la version 22 LTS o superior."
}

if (-not $env:ARQIVEN_DATA) {
  $base = $env:LOCALAPPDATA
  if (-not $base) { $base = $env:USERPROFILE }
  $env:ARQIVEN_DATA = Join-Path $base "ARQIVEN\local"
}
New-Item -ItemType Directory -Force -Path $env:ARQIVEN_DATA | Out-Null

if (-not $env:ARQIVEN_USER -and $env:USERNAME -match '^[A-Za-z0-9._-]{1,64}$') { $env:ARQIVEN_USER = $env:USERNAME }
if (-not $env:OLLAMA_HOST) { $env:OLLAMA_HOST = "http://127.0.0.1:11434" }
if (-not $env:ARQIVEN_MODEL) { $env:ARQIVEN_MODEL = "qwen3:8b" }
if (-not $env:ARQIVEN_HOST) { $env:ARQIVEN_HOST = "127.0.0.1" }
if (-not $env:ARQIVEN_PORT) { $env:ARQIVEN_PORT = "4174" }
$env:ARQIVEN_THINK = "false"

function Get-ListenPid([int]$Port) {
  $lines = netstat -ano | Select-String (":${Port}\s")
  foreach ($line in $lines) {
    if ($line.Line -match "LISTENING\s+(\d+)\s*$") {
      $pidValue = [int]$Matches[1]
      if ($pidValue -gt 4) { return $pidValue }
    }
  }
  return 0
}

$busy = Get-ListenPid ([int]$env:ARQIVEN_PORT)
if ($busy -gt 4) {
  $command = ""
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$busy"
    if ($proc) { $command = [string]$proc.CommandLine }
  } catch { }
  if ($command -match "server\.mjs") {
    Write-Host "El puerto $($env:ARQIVEN_PORT) ya lo usa un ARQIVEN anterior (pid $busy). Lo paro para no dejar el servidor viejo escuchando."
    Stop-Process -Id $busy -Force
    Start-Sleep -Milliseconds 400
  } else {
    Write-Error "El puerto $($env:ARQIVEN_PORT) esta ocupado por el pid $busy y no parece ARQIVEN. No lo paro."
  }
}

Write-Host "ARQIVEN local: http://127.0.0.1:$($env:ARQIVEN_PORT)/arqiven/"
Write-Host "Ollama previsto en $($env:OLLAMA_HOST) con $($env:ARQIVEN_MODEL)."
Write-Host "qwen3:8b es un modelo de terceros. ARQIVEN no lo creo."
Write-Host "Historial en $($env:ARQIVEN_DATA)"
Write-Host "Este script no abre el puerto 11434 ni crea tuneles."

if ($Abrir) {
  $server = Join-Path $Root "local\arqiven\server.mjs"
  $nodeProc = Start-Process -FilePath $node.Source -ArgumentList $server -WorkingDirectory $Root -PassThru -WindowStyle Minimized
  $deadline = (Get-Date).AddSeconds(20)
  $up = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $probe = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$($env:ARQIVEN_PORT)/api/arqiven/status"
      if ($probe.StatusCode -eq 200) { $up = $true; break }
    } catch { }
    Start-Sleep -Milliseconds 300
  }
  if (-not $up) {
    if (-not $nodeProc.HasExited) { Stop-Process -Id $nodeProc.Id -Force }
    Write-Error "El backend no respondio en http://127.0.0.1:$($env:ARQIVEN_PORT)/"
  }
  Start-Process "http://127.0.0.1:$($env:ARQIVEN_PORT)/arqiven/"
  Write-Host "Navegador abierto. Cierra esta ventana para parar ARQIVEN."
  try {
    Wait-Process -Id $nodeProc.Id
  } finally {
    if (-not $nodeProc.HasExited) { Stop-Process -Id $nodeProc.Id -Force }
  }
  exit 0
}

& node (Join-Path $Root "local\arqiven\server.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
