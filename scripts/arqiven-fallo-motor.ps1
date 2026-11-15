# Para Ollama, comprueba el error y vuelve a arrancarlo.
# Carpeta de datos en %TEMP%. No usa el historial real. No cambia el firmware.
# Uso, en el PC:
#   powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-fallo-motor.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Port = 4175
$Backend = "http://127.0.0.1:$Port"
$Ollama = "http://127.0.0.1:11434"
$script:Data = Join-Path $env:TEMP ("ARQIVEN-fallo-" + [guid]::NewGuid().ToString("N"))
$script:ServerPid = 0
$fails = New-Object System.Collections.Generic.List[string]

function Say([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "OK     $Name" }
  else {
    Write-Host "FALLO  $Name. $Detail"
    $script:fails.Add($Name)
  }
}

function Get-OllamaPids {
  $ids = @()
  try {
    $procs = Get-CimInstance Win32_Process -Filter "Name = 'ollama.exe' OR Name = 'ollama app.exe'"
    foreach ($proc in @($procs)) { if ([int]$proc.ProcessId -gt 4) { $ids += [int]$proc.ProcessId } }
  } catch { }
  return $ids
}

function Stop-OllamaProcess {
  foreach ($procId in (Get-OllamaPids)) {
    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Milliseconds 600
}

function Test-OllamaUp {
  try {
    $tags = Invoke-WebRequest -Uri "$Ollama/api/tags" -TimeoutSec 2 -UseBasicParsing
    return [int]$tags.StatusCode -eq 200
  } catch { return $false }
}

function Start-OllamaProcess {
  $exe = $null
  $cmd = Get-Command ollama -ErrorAction SilentlyContinue
  if ($cmd) { $exe = $cmd.Source }
  if (-not $exe) {
    $candidate = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
    if (Test-Path -LiteralPath $candidate) { $exe = $candidate }
  }
  if (-not $exe) { return $false }
  Start-Process -FilePath $exe -ArgumentList "serve" -WindowStyle Hidden | Out-Null
  for ($i = 0; $i -lt 40; $i++) {
    if (Test-OllamaUp) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Start-TempBackend {
  $env:ARQIVEN_DATA = $script:Data
  $env:ARQIVEN_PORT = "$Port"
  $env:ARQIVEN_HOST = "127.0.0.1"
  $env:OLLAMA_HOST = $Ollama
  $env:ARQIVEN_THINK = "false"
  New-Item -ItemType Directory -Force -Path $script:Data | Out-Null
  $proc = Start-Process -FilePath "node" -ArgumentList "local/arqiven/server.mjs" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  $script:ServerPid = $proc.Id
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $status = Invoke-RestMethod -Uri "$Backend/api/arqiven/status" -TimeoutSec 2 -UseBasicParsing
      if ($status.mode -eq "local") { return $status }
    } catch { }
    Start-Sleep -Milliseconds 250
  }
  return $null
}

function Stop-TempBackend {
  if ($script:ServerPid -gt 4) {
    Stop-Process -Id $script:ServerPid -Force -ErrorAction SilentlyContinue
  }
}

function Read-Chat([string]$Json) {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(3)
  $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$Backend/api/arqiven/chat")
  $request.Content = New-Object System.Net.Http.StringContent($Json, [Text.Encoding]::UTF8, "application/json")
  $lines = New-Object System.Collections.Generic.List[string]
  try {
    $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).GetAwaiter().GetResult()
    $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
    $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::UTF8)
    try {
      while ($null -ne ($line = $reader.ReadLine())) {
        if ($line.Trim().Length -gt 0) { $lines.Add($line) }
      }
    } finally {
      $reader.Dispose()
      $stream.Dispose()
    }
  } finally {
    $client.Dispose()
  }
  return $lines
}

Add-Type -AssemblyName System.Net.Http
Write-Host "Datos temporales: $script:Data"
Write-Host "No se usa el historial real y no se cambia el firmware."

$wasUp = Test-OllamaUp
Stop-OllamaProcess
$down = -not (Test-OllamaUp)
Say "ollama parado" $down "el puerto 11434 sigue respondiendo"

$status = Start-TempBackend
Say "backend temporal" ($null -ne $status) "no arranca en $Backend"
if ($status) {
  Say "estado sin ollama" ($status.ollama -eq "down") "ollama=$($status.ollama)"
}

try {
  $page = Invoke-WebRequest -Uri "$Backend/arqiven/" -TimeoutSec 5 -UseBasicParsing
  $ui = Invoke-WebRequest -Uri "$Backend/arqiven/app.js" -TimeoutSec 5 -UseBasicParsing
  $pageOk = [int]$page.StatusCode -eq 200
  $textOk = [string]$ui.Content -match "Ollama no responde en este equipo"
  Say "ui abre y nombra el fallo" ($pageOk -and $textOk) "pagina=$($page.StatusCode)"
} catch {
  Say "ui abre y nombra el fallo" $false $_.Exception.Message
}

try {
  $json = '{"messages":[{"role":"user","content":"Di solo: mesa."}]}'
  $blob = (Read-Chat $json) -join "`n"
  $clear = $blob -match "ollama-down" -and $blob -match "Ollama no responde"
  Say "chat con error claro" $clear "no aparece ollama-down"
} catch {
  Say "chat con error claro" $false $_.Exception.Message
}

$back = Start-OllamaProcess
Say "ollama recuperado" $back "no volvio el puerto 11434"
if ($back) {
  try {
    $again = Invoke-RestMethod -Uri "$Backend/api/arqiven/status" -TimeoutSec 5 -UseBasicParsing
    Say "estado con ollama" ($again.ollama -eq "up") "ollama=$($again.ollama)"
  } catch {
    Say "estado con ollama" $false $_.Exception.Message
  }
  try {
    $json = '{"messages":[{"role":"user","content":"Di solo: mesa."}]}'
    $blob = (Read-Chat $json) -join "`n"
    $done = $blob -match '"type"\s*:\s*"done"' -and $blob -notmatch "ollama-down"
    Say "chat recuperado" $done "la respuesta no cerro"
  } catch {
    Say "chat recuperado" $false $_.Exception.Message
  }
}

Stop-TempBackend
if (Test-Path -LiteralPath $script:Data) {
  Remove-Item -LiteralPath $script:Data -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not $wasUp -and -not $back) {
  Write-Host "Ollama no estaba en marcha al empezar y no se pudo abrir."
}
Write-Host ""
if ($fails.Count -eq 0) {
  Write-Host "Todo OK."
  exit 0
}
Write-Host ("Fallos: " + ($fails -join ", "))
exit 1
