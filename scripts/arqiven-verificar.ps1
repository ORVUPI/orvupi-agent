# Comprueba el backend local y deja una linea OK o FALLO por punto.
# Puede parar y volver a arrancar el proceso de ARQIVEN en 127.0.0.1:4174.
# Uso, con Ollama ya en marcha:
#   powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-verificar.ps1
param(
  [string]$Backend = "http://127.0.0.1:4174"
)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$fails = New-Object System.Collections.Generic.List[string]

function Say([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "OK     $Name" }
  else {
    Write-Host "FALLO  $Name. $Detail"
    $script:fails.Add($Name)
  }
}

function Listen-Pid([int]$Port) {
  $lines = netstat -ano | Select-String (":$Port\s")
  foreach ($line in $lines) {
    if ($line.Line -match "LISTENING\s+(\d+)\s*$") {
      $pidValue = [int]$Matches[1]
      if ($pidValue -gt 4) { return $pidValue }
    }
  }
  return 0
}

function Wait-Backend {
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $status = Invoke-RestMethod -Uri "$Backend/api/arqiven/status" -TimeoutSec 2
      if ($status.mode -eq "local") { return $true }
    } catch { }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Start-Backend {
  if (-not $env:ARQIVEN_DATA) {
    $base = $env:LOCALAPPDATA
    if (-not $base) { $base = $env:USERPROFILE }
    $env:ARQIVEN_DATA = Join-Path $base "ARQIVEN\local"
  }
  if (-not $env:ARQIVEN_USER -and $env:USERNAME -match '^[A-Za-z0-9._-]{1,64}$') { $env:ARQIVEN_USER = $env:USERNAME }
  $env:OLLAMA_HOST = "http://127.0.0.1:11434"
  $env:ARQIVEN_THINK = "false"
  New-Item -ItemType Directory -Force -Path $env:ARQIVEN_DATA | Out-Null
  Start-Process -FilePath "node" -ArgumentList "local/arqiven/server.mjs" -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  return (Wait-Backend)
}

function Stop-Backend {
  $procId = Listen-Pid 4174
  if ($procId -gt 4) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 400
}

function Invoke-Api([string]$Method, [string]$Path, [string]$User, [object]$Body) {
  $headers = @{ "x-arqiven-user" = $User }
  $params = @{ Method = $Method; Uri = "$Backend$Path"; Headers = $headers; TimeoutSec = 30 }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Compress -Depth 6)
  }
  return Invoke-WebRequest @params
}

Add-Type -AssemblyName System.Net.Http
if (-not (Wait-Backend)) {
  if (-not (Start-Backend)) { Say "backend" $false "no responde en $Backend"; exit 1 }
}
Say "backend" $true ""

$owner = "crist"
if ($env:ARQIVEN_USER) { $owner = $env:ARQIVEN_USER }
$chatId = "verificar-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$projectId = "proy-" + [guid]::NewGuid().ToString("N").Substring(0, 8)

try {
  $chat = Invoke-Api "POST" "/api/arqiven/chat" $owner @{
    requestId = "req-$chatId"
    conversationId = $chatId
    messages = @(@{ role = "user"; content = "Di solo la palabra mesa." })
  }
  $done = $false
  foreach ($line in ($chat.Content -split "`n")) {
    if ($line -match '"type"\s*:\s*"done"') { $done = $true }
  }
  Say "crear chat" $done "no llego el cierre de la respuesta"
} catch {
  Say "crear chat" $false $_.Exception.Message
}

try {
  $created = Invoke-Api "POST" "/api/arqiven/projects" $owner @{ id = $projectId; name = "Obra" }
  $renamed = Invoke-Api "PATCH" "/api/arqiven/projects/$projectId" $owner @{ name = "Obra norte" }
  $ok = $created.StatusCode -eq 201 -and $renamed.Content -match "Obra norte"
  Say "crear y renombrar proyecto" $ok "codigo $($created.StatusCode)"
} catch {
  Say "crear y renombrar proyecto" $false $_.Exception.Message
}

try {
  $moved = Invoke-Api "POST" "/api/arqiven/conversations/$chatId/move" $owner @{ projectId = $projectId }
  $opened = Invoke-Api "GET" "/api/arqiven/projects/$projectId" $owner $null
  $ok = $moved.StatusCode -eq 200 -and $opened.Content -match $chatId
  Say "mover chat y reabrir" $ok "el proyecto no muestra el chat"
} catch {
  Say "mover chat y reabrir" $false $_.Exception.Message
}

try {
  Invoke-Api "POST" "/api/arqiven/projects/$projectId/members" $owner @{ userId = "lector"; role = "reader" } | Out-Null
  Invoke-Api "POST" "/api/arqiven/projects/$projectId/members" $owner @{ userId = "editor"; role = "editor" } | Out-Null
  $lectorBlocked = $false
  try { Invoke-Api "PATCH" "/api/arqiven/projects/$projectId" "lector" @{ name = "No" } | Out-Null } catch { if ($_.Exception.Response.StatusCode.value__ -eq 403) { $lectorBlocked = $true } }
  $editorRename = Invoke-Api "PATCH" "/api/arqiven/projects/$projectId" "editor" @{ name = "Obra sur" }
  $editorBlocked = $false
  try { Invoke-Api "DELETE" "/api/arqiven/projects/$projectId" "editor" $null | Out-Null } catch { if ($_.Exception.Response.StatusCode.value__ -eq 403) { $editorBlocked = $true } }
  $ok = $lectorBlocked -and $editorRename.StatusCode -eq 200 -and $editorBlocked
  Say "permisos lector y editor" $ok "lector=$lectorBlocked editor-renombra=$($editorRename.StatusCode) editor-no-borra=$editorBlocked"
} catch {
  Say "permisos lector y editor" $false $_.Exception.Message
}

try {
  $again = Invoke-Api "POST" "/api/arqiven/chat" $owner @{
    requestId = "req-again-$chatId"
    conversationId = $chatId
    regenerate = $true
  }
  $ok = $again.Content -match '"type"\s*:\s*"done"'
  $saved = Invoke-Api "GET" "/api/arqiven/conversations/$chatId" $owner $null
  $users = ([regex]::Matches($saved.Content, '"role"\s*:\s*"user"')).Count
  Say "regenerar" ($ok -and $users -eq 1) "cierres=$ok usuarios=$users"
} catch {
  Say "regenerar" $false $_.Exception.Message
}

try {
  $longId = "cola-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
  $longBody = '{"requestId":"req-' + $longId + '","conversationId":"' + $longId + '","messages":[{"role":"user","content":"Escribe un relato largo, sin parar, sobre una caminata."}]}'
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(3)
  $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$Backend/api/arqiven/chat")
  $request.Headers.Add("x-arqiven-user", $owner)
  $request.Content = New-Object System.Net.Http.StringContent($longBody, [Text.Encoding]::UTF8, "application/json")
  $first = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead)
  $null = $first.GetAwaiter().GetResult()
  $secondId = "cola2-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
  $queued = Invoke-Api "POST" "/api/arqiven/chat" $owner @{
    requestId = "req-$secondId"
    conversationId = $secondId
    messages = @(@{ role = "user"; content = "Di solo: segundo." })
  }
  $saw = $queued.Content -match "en espera"
  Invoke-Api "POST" "/api/arqiven/cancel" $owner @{ requestId = "req-$longId" } | Out-Null
  Invoke-Api "POST" "/api/arqiven/cancel" $owner @{ requestId = "req-$secondId" } | Out-Null
  $client.Dispose()
  Say "cola en espera" $saw "la segunda peticion no aviso en espera"
} catch {
  Say "cola en espera" $false $_.Exception.Message
}

try {
  Stop-Backend
  $up = Start-Backend
  $back = Invoke-Api "GET" "/api/arqiven/projects/$projectId" $owner $null
  $chatBack = Invoke-Api "GET" "/api/arqiven/conversations/$chatId" $owner $null
  $ok = $up -and $back.Content -match "Obra" -and $chatBack.Content -match $chatId
  Say "persistencia tras reinicio" $ok "el proceso nuevo no recupero el proyecto o el chat"
} catch {
  Say "persistencia tras reinicio" $false $_.Exception.Message
}

Write-Host ""
if ($fails.Count -eq 0) {
  Write-Host "Todo OK."
  exit 0
}
Write-Host ("Fallos: " + ($fails -join ", "))
exit 1
