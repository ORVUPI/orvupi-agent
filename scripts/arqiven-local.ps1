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

function Get-ArqivenNodes {
  $ids = @()
  try {
    $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"
    foreach ($proc in @($procs)) {
      $command = [string]$proc.CommandLine
      if ($command -match 'local[\\/]arqiven[\\/]server\.mjs') { $ids += [int]$proc.ProcessId }
    }
  } catch { }
  return $ids
}

function Stop-ArqivenNodes {
  foreach ($procId in (Get-ArqivenNodes)) {
    if ($procId -gt 4) {
      Write-Host "Paro un ARQIVEN anterior (pid $procId)."
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
  Start-Sleep -Milliseconds 400
}

function Get-ArqivenBuild([string]$Dir) {
  $git = Get-Command git -ErrorAction SilentlyContinue
  if ($git) {
    try {
      $sha = & git -C $Dir rev-parse --short HEAD 2>$null
      if ($sha) { return ([string]$sha).Trim() }
    } catch { }
  }
  $file = Join-Path $Dir "local\arqiven\server.mjs"
  if (Test-Path $file) { return "file-" + (Get-Item $file).LastWriteTimeUtc.ToString("yyyyMMddHHmmss") }
  return "sin-build"
}

function Assert-FreshServer([string]$Url, [datetime]$NotBefore, [int]$ExpectedPid) {
  $status = Invoke-RestMethod -UseBasicParsing -TimeoutSec 3 -Uri "$Url/api/arqiven/status"
  if (-not $status.startedAt -or -not $status.pid) {
    Write-Error "El servidor que responde no trae hora de arranque ni pid. Es una version anterior. No sigo."
  }
  $started = [datetime]::Parse([string]$status.startedAt, [cultureinfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
  $fresh = $started.ToUniversalTime() -ge $NotBefore.ToUniversalTime().AddSeconds(-3)
  $same = ($ExpectedPid -gt 4 -and [int]$status.pid -eq $ExpectedPid)
  if (-not ($fresh -or $same)) {
    Write-Error "Responde un ARQIVEN que ya estaba en marcha (pid $($status.pid), arranque $($status.startedAt)). No sigo."
  }
  Write-Host "Servidor nuevo: pid $($status.pid), arranque $($status.startedAt), build $($status.build)."
  return $status
}

Stop-ArqivenNodes
$env:ARQIVEN_BUILD = Get-ArqivenBuild $Root
$startedMark = Get-Date

Write-Host "ARQIVEN local: http://127.0.0.1:$($env:ARQIVEN_PORT)/arqiven/"
Write-Host "Ollama previsto en $($env:OLLAMA_HOST) con $($env:ARQIVEN_MODEL)."
Write-Host "qwen3:8b es un modelo de terceros. ARQIVEN no lo creo."
Write-Host "Historial en $($env:ARQIVEN_DATA)"
Write-Host "Este script no abre el puerto 11434 ni crea tuneles."

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
Assert-FreshServer "http://127.0.0.1:$($env:ARQIVEN_PORT)" $startedMark $nodeProc.Id | Out-Null
if ($Abrir) { Start-Process "http://127.0.0.1:$($env:ARQIVEN_PORT)/arqiven/" }
Write-Host "Servidor en marcha. Cierra esta ventana para parar ARQIVEN."
try {
  Wait-Process -Id $nodeProc.Id
} finally {
  if (-not $nodeProc.HasExited) { Stop-Process -Id $nodeProc.Id -Force }
}
exit 0
