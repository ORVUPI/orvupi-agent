# Arranca ARQIVEN en este equipo. No abre el puerto 11434 ni crea un tunel.
# Uso: powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-local.ps1
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

Write-Host "ARQIVEN local: http://127.0.0.1:$($env:ARQIVEN_PORT)/arqiven/"
Write-Host "Ollama previsto en $($env:OLLAMA_HOST) con $($env:ARQIVEN_MODEL)."
Write-Host "qwen3:8b es un modelo de terceros. ARQIVEN no lo creo."
Write-Host "Historial en $($env:ARQIVEN_DATA)"
Write-Host "Este script no abre el puerto 11434 ni crea tuneles."

& node (Join-Path $Root "local\arqiven\server.mjs")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
