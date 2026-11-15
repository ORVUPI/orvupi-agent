# Mide latencia y cancelacion contra el Ollama de este equipo.
# No abre puertos. No descarga modelos. No es la prueba de 134 tok/s.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1 -Completa
#   powershell -ExecutionPolicy Bypass -File .\scripts\arqiven-humo.ps1 -Backend "http://127.0.0.1:4174"
param(
  [string]$Ollama = "http://127.0.0.1:11434",
  [string]$Modelo = "qwen3:8b",
  [int]$NumPredict = 512,
  [switch]$Completa,
  [string]$Backend = ""
)
$ErrorActionPreference = "Stop"
if ($Completa) { $NumPredict = 1024 }

function Fail([string]$Message) {
  Write-Host $Message
  exit 1
}

Add-Type -AssemblyName System.Net.Http

function Read-Ndjson([string]$Url, [string]$Json, [System.Threading.CancellationToken]$Token, [scriptblock]$OnLine) {
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(5)
  $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, $Url)
  $request.Content = New-Object System.Net.Http.StringContent($Json, [Text.Encoding]::UTF8, "application/json")
  $response = $client.SendAsync($request, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead, $Token).GetAwaiter().GetResult()
  if (-not $response.IsSuccessStatusCode) {
    $detail = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    $client.Dispose()
    Fail "Ollama respondio $($response.StatusCode). $detail"
  }
  $stream = $response.Content.ReadAsStreamAsync().GetAwaiter().GetResult()
  $reader = New-Object System.IO.StreamReader($stream)
  try {
    while ($null -ne ($line = $reader.ReadLine())) {
      if ($line.Trim().Length -gt 0) { & $OnLine $line }
      if ($Token.IsCancellationRequested) { break }
    }
  } catch [System.OperationCanceledException] {
    # La cancelacion cierra la lectura. Es el resultado buscado.
  } finally {
    $reader.Dispose()
    $stream.Dispose()
    $client.Dispose()
  }
}

try {
  $tags = Invoke-RestMethod -Uri "$Ollama/api/tags" -TimeoutSec 5 -UseBasicParsing
} catch {
  Fail "Ollama no responde en $Ollama. Abrelo en este equipo y vuelve a ejecutar el script."
}

$names = @()
foreach ($item in @($tags.models)) { $names += [string]$item.name }
if ($names -notcontains $Modelo) {
  Fail "El modelo $Modelo no esta descargado en Ollama. Modelos vistos: $($names -join ', ')"
}

$pregunta = "Escribe un relato continuo en espanol, en prosa y sin listas, de varias paginas, sobre una caminata por la costa al amanecer. No resumas y no te detengas antes de agotar el espacio."
$prompt = '{"model":"' + $Modelo + '","stream":true,"think":false,"messages":[{"role":"user","content":"' + $pregunta + '"}],"options":{"num_ctx":4096,"num_predict":' + $NumPredict + ',"temperature":0.2}}'
$started = Get-Date
$ttft = $null
$done = $null
$pieces = New-Object System.Collections.Generic.List[string]
Read-Ndjson "$Ollama/api/chat" $prompt ([System.Threading.CancellationToken]::None) {
  param($line)
  $event = $line | ConvertFrom-Json
  if ($event.message.content) {
    if (-not $script:ttft) { $script:ttft = ((Get-Date) - $script:started).TotalMilliseconds }
    $script:pieces.Add([string]$event.message.content)
  }
  if ($event.done -eq $true) { $script:done = $event }
}

if (-not $done) { Fail "Ollama no cerro la respuesta de latencia." }
$evalCount = [double]$done.eval_count
$evalNs = [double]$done.eval_duration
$tokS = 0
if ($evalNs -gt 0) { $tokS = [math]::Round($evalCount / ($evalNs / 1000000000), 1) }
$loadNs = [double]$done.load_duration
$thermal = "caliente"
if ($loadNs -gt 50000000) { $thermal = "frio" }

Write-Host "Latencia contra Ollama en este equipo."
Write-Host "  modelo: $Modelo (tercero; ARQIVEN no lo creo)"
Write-Host "  think: false"
Write-Host "  num_ctx: 4096"
Write-Host "  num_predict: $NumPredict"
Write-Host ("  primer token: {0} ms" -f [math]::Round($ttft, 1))
Write-Host "  tokens de salida (eval_count): $evalCount"
Write-Host "  tokens de entrada (prompt_eval_count): $($done.prompt_eval_count)"
Write-Host "  tok/s de generacion (eval_count / eval_duration): $tokS"
Write-Host ("  carga del modelo: {0} ({1} ms)" -f $thermal, [math]::Round($loadNs / 1000000, 1))
if ($evalCount -lt 32) { Write-Host "  Aviso: han salido menos de 32 tokens. Ese tok/s no es representativo." }
Write-Host "  El relato pide cientos de tokens. Una respuesta de 4 tokens no sirve para medir tok/s."

$cancelJson = '{"model":"' + $Modelo + '","stream":true,"think":false,"messages":[{"role":"user","content":"Cuenta del uno al cien, despacio, un numero por linea."}],"options":{"num_ctx":4096,"num_predict":256,"temperature":0.2}}'
$cts = New-Object System.Threading.CancellationTokenSource
$cancelStarted = Get-Date
$cancelTokens = 0
$cancelError = $null
try {
  Read-Ndjson "$Ollama/api/chat" $cancelJson $cts.Token {
    param($line)
    $event = $line | ConvertFrom-Json
    if ($event.message.content) {
      $script:cancelTokens += 1
      if ($script:cancelTokens -eq 1) { $script:cts.Cancel() }
    }
  }
} catch {
  $cancelError = $_.Exception.Message
}
$cancelMs = ((Get-Date) - $cancelStarted).TotalMilliseconds
if ($cancelTokens -lt 1) { Fail "No llego ningun token antes de intentar cancelar. $cancelError" }
if ($cancelTokens -gt 30) { Fail "La cancelacion no corto la generacion: llegaron $cancelTokens fragmentos." }
Write-Host ("Cancelacion: se corto tras {0} fragmento(s), a los {1} ms del inicio." -f $cancelTokens, [math]::Round($cancelMs, 1))

if ($Backend) {
  try {
    $status = Invoke-RestMethod -Uri "$Backend/api/arqiven/status" -TimeoutSec 5 -UseBasicParsing
  } catch {
    Fail "El backend local no responde en $Backend. Arranca scripts\arqiven-local.ps1 primero."
  }
  if ($status.mode -ne "local") { Fail "El backend no anuncia modo local." }
  $id = "humo-" + [guid]::NewGuid().ToString("N").Substring(0, 12)
  $chat = '{"requestId":"' + $id + '","conversationId":"humo-local-1","messages":[{"role":"user","content":"' + $pregunta + '"}]}'
  $backendDone = $false
  Read-Ndjson "$Backend/api/arqiven/chat" $chat ([System.Threading.CancellationToken]::None) {
    param($line)
    $event = $line | ConvertFrom-Json
    if ($event.type -eq "done") { $script:backendDone = $true }
    if ($event.type -eq "error") { Fail "El backend local devolvio $($event.code): $($event.message)" }
  }
  if (-not $backendDone) { Fail "El backend local no termino la respuesta." }
  Write-Host "Backend local: una respuesta completa en $Backend."
  $slowId = "humo-" + [guid]::NewGuid().ToString("N").Substring(0, 12)
  $slow = '{"requestId":"' + $slowId + '","conversationId":"humo-local-2","messages":[{"role":"user","content":"Cuenta del uno al cien."}]}'
  $backendTokens = 0
  try {
    Read-Ndjson "$Backend/api/arqiven/chat" $slow ([System.Threading.CancellationToken]::None) {
      param($line)
      $event = $line | ConvertFrom-Json
      if ($event.type -eq "token") {
        $script:backendTokens += 1
        if ($script:backendTokens -eq 1) {
          Invoke-RestMethod -Method Post -Uri "$script:Backend/api/arqiven/cancel" -ContentType "application/json" -Body (@{ requestId = $script:slowId } | ConvertTo-Json) -UseBasicParsing | Out-Null
        }
      }
      if ($event.type -eq "error" -and $event.code -ne "cancelled") {
        Fail "Cancelacion en el backend: $($event.code) $($event.message)"
      }
    }
  } catch {
    if ($script:backendTokens -lt 1) { Fail "El backend no entrego un token antes de cancelar." }
  }
  if ($backendTokens -lt 1) { Fail "El backend no entrego un token antes de cancelar." }
  Write-Host "Backend local: la generacion se cancelo tras $backendTokens fragmento(s)."
}

Write-Host "Humo terminado."
exit 0
