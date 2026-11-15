# Comprueba el backend local en Windows PowerShell 5.1.
# El chat se lee linea a linea en UTF-8. Invoke-WebRequest lleva -UseBasicParsing.
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

function Stop-Backend {
  foreach ($procId in (Get-ArqivenNodes)) {
    if ($procId -gt 4) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue }
  }
  Start-Sleep -Milliseconds 400
}

function Wait-Backend {
  for ($i = 0; $i -lt 40; $i++) {
    try {
      $status = Invoke-RestMethod -Uri "$Backend/api/arqiven/status" -TimeoutSec 2 -UseBasicParsing
      if ($status.mode -eq "local") { return $status }
    } catch { }
    Start-Sleep -Milliseconds 250
  }
  return $null
}

function Assert-Fresh([object]$Status, [datetime]$NotBefore, [int]$ExpectedPid) {
  if (-not $Status -or -not $Status.startedAt -or -not $Status.pid) {
    return "el servidor no trae hora de arranque ni pid: es una version anterior"
  }
  $started = [datetime]::Parse([string]$Status.startedAt, [cultureinfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind)
  $fresh = $started.ToUniversalTime() -ge $NotBefore.ToUniversalTime().AddSeconds(-3)
  $same = ($ExpectedPid -gt 4 -and [int]$Status.pid -eq $ExpectedPid)
  if (-not ($fresh -or $same)) {
    return "responde un ARQIVEN viejo (pid $($Status.pid), arranque $($Status.startedAt))"
  }
  return ""
}

function Start-Backend {
  Stop-Backend
  if (-not $env:ARQIVEN_DATA) {
    $base = $env:LOCALAPPDATA
    if (-not $base) { $base = $env:USERPROFILE }
    $env:ARQIVEN_DATA = Join-Path $base "ARQIVEN\local"
  }
  if (-not $env:ARQIVEN_USER -and $env:USERNAME -match '^[A-Za-z0-9._-]{1,64}$') { $env:ARQIVEN_USER = $env:USERNAME }
  $env:OLLAMA_HOST = "http://127.0.0.1:11434"
  $env:ARQIVEN_THINK = "false"
  if (-not $env:ARQIVEN_BUILD) {
    $file = Join-Path $Root "local\arqiven\server.mjs"
    if (Test-Path $file) { $env:ARQIVEN_BUILD = "file-" + (Get-Item $file).LastWriteTimeUtc.ToString("yyyyMMddHHmmss") }
  }
  New-Item -ItemType Directory -Force -Path $env:ARQIVEN_DATA | Out-Null
  $mark = Get-Date
  $proc = Start-Process -FilePath "node" -ArgumentList "local/arqiven/server.mjs" -WorkingDirectory $Root -WindowStyle Hidden -PassThru
  $status = Wait-Backend
  if (-not $status) { return "no responde en $Backend" }
  $stale = Assert-Fresh $status $mark $proc.Id
  if ($stale) { return $stale }
  Write-Host "Servidor nuevo: pid $($status.pid), arranque $($status.startedAt), build $($status.build)."
  return ""
}

function Invoke-Api([string]$Method, [string]$Path, [string]$User, $Body) {
  $headers = @{ "x-arqiven-user" = $User }
  $params = @{ Method = $Method; Uri = "$Backend$Path"; Headers = $headers; TimeoutSec = 30; UseBasicParsing = $true }
  if ($null -ne $Body) {
    $params.ContentType = "application/json; charset=utf-8"
    $params.Body = ($Body | ConvertTo-Json -Compress -Depth 6)
  }
  return Invoke-WebRequest @params
}

Add-Type -AssemblyName System.Net.Http

function Read-Chat([string]$Json, [string]$User) {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(3)
  $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$Backend/api/arqiven/chat")
  [void]$request.Headers.TryAddWithoutValidation("x-arqiven-user", $User)
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

function Begin-Chat([string]$Json, [string]$User) {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(3)
  $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, "$Backend/api/arqiven/chat")
  [void]$request.Headers.TryAddWithoutValidation("x-arqiven-user", $User)
  $request.Content = New-Object System.Net.Http.StringContent($Json, [Text.Encoding]::UTF8, "application/json")
  $task = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead)
  return @{ Client = $client; Task = $task }
}

$startError = Start-Backend
if ($startError) { Say "backend" $false $startError; exit 1 }
Say "backend" $true ""

$owner = "crist"
if ($env:ARQIVEN_USER) { $owner = $env:ARQIVEN_USER }
$chatId = "verificar-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$projectId = "proy-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
$reqChat = "req-$chatId"

try {
  $json = '{"requestId":"' + $reqChat + '","conversationId":"' + $chatId + '","messages":[{"role":"user","content":"Di solo la palabra mesa."}]}'
  $lines = Read-Chat $json $owner
  $done = $false
  foreach ($line in $lines) { if ($line -match '"type"\s*:\s*"done"') { $done = $true } }
  Say "crear chat" $done "no llego el cierre de la respuesta"
} catch {
  Say "crear chat" $false $_.Exception.Message
}

try {
  $created = Invoke-Api "POST" "/api/arqiven/projects" $owner @{ id = $projectId; name = "Obra" }
  $renamed = Invoke-Api "PATCH" "/api/arqiven/projects/$projectId" $owner @{ name = "Obra norte" }
  $ok = [int]$created.StatusCode -eq 201 -and $renamed.Content -match "Obra norte"
  Say "crear y renombrar proyecto" $ok "codigo $($created.StatusCode)"
} catch {
  Say "crear y renombrar proyecto" $false $_.Exception.Message
}

try {
  $moved = Invoke-Api "POST" "/api/arqiven/conversations/$chatId/move" $owner @{ projectId = $projectId }
  $opened = Invoke-Api "GET" "/api/arqiven/projects/$projectId" $owner $null
  $ok = [int]$moved.StatusCode -eq 200 -and $opened.Content -match $chatId
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
  $ok = $lectorBlocked -and [int]$editorRename.StatusCode -eq 200 -and $editorBlocked
  Say "permisos lector y editor" $ok "lector=$lectorBlocked editor-renombra=$($editorRename.StatusCode) editor-no-borra=$editorBlocked"
} catch {
  Say "permisos lector y editor" $false $_.Exception.Message
}

try {
  $json = '{"requestId":"req-again-' + $chatId + '","conversationId":"' + $chatId + '","regenerate":true}'
  $lines = Read-Chat $json $owner
  $done = $false
  foreach ($line in $lines) { if ($line -match '"type"\s*:\s*"done"') { $done = $true } }
  $saved = Invoke-Api "GET" "/api/arqiven/conversations/$chatId" $owner $null
  $users = ([regex]::Matches([string]$saved.Content, '"role"\s*:\s*"user"')).Count
  Say "regenerar" ($done -and $users -eq 1) "cierre=$done usuarios=$users"
} catch {
  Say "regenerar" $false $_.Exception.Message
}

try {
  $longId = "cola-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
  $longReq = "req-$longId"
  $longJson = '{"requestId":"' + $longReq + '","conversationId":"' + $longId + '","messages":[{"role":"user","content":"Escribe un relato largo, sin parar, sobre una caminata."}]}'
  $first = Begin-Chat $longJson $owner
  $null = $first.Task.GetAwaiter().GetResult()
  $secondId = "cola2-" + [guid]::NewGuid().ToString("N").Substring(0, 8)
  $secondJson = '{"requestId":"req-' + $secondId + '","conversationId":"' + $secondId + '","messages":[{"role":"user","content":"Di solo: segundo."}]}'
  $second = Begin-Chat $secondJson $owner
  $response = $second.Task.GetAwaiter().GetResult()
  $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
  $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::UTF8)
  $saw = $false
  $guard = [DateTime]::UtcNow.AddSeconds(20)
  try {
    while ((-not $saw) -and [DateTime]::UtcNow -lt $guard) {
      $line = $reader.ReadLine()
      if ($null -eq $line) { break }
      if ($line -match "en espera") { $saw = $true }
    }
  } finally {
    $reader.Dispose()
    $stream.Dispose()
    $second.Client.Dispose()
    $first.Client.Dispose()
  }
  try { Invoke-Api "POST" "/api/arqiven/cancel" $owner @{ requestId = $longReq } | Out-Null } catch { }
  try { Invoke-Api "POST" "/api/arqiven/cancel" $owner @{ requestId = "req-$secondId" } | Out-Null } catch { }
  Say "cola en espera" $saw "la segunda peticion no aviso en espera"
} catch {
  Say "cola en espera" $false $_.Exception.Message
}

try {
  Stop-Backend
  $up = -not (Start-Backend)
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
