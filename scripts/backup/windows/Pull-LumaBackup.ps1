<#
.SYNOPSIS
  Descarga a esta PC los respaldos cifrados de Luma desde el servidor.

.DESCRIPTION
  La PC DESCARGA (el servidor no guarda ninguna credencial de tu equipo). Hace esto:
    1. Lee STATUS en el servidor y avisa si el último respaldo falló.
    2. Descarga los últimos N paquetes que todavía no tienes y verifica su SHA-256.
    3. Conserva los últimos KeepLocal paquetes y borra los más viejos.
    4. Avisa si el paquete más reciente que tienes tiene más de MaxAgeHours horas.
  Los paquetes siguen cifrados: solo se abren con tu clave privada de age.
  Registro: <Destination>\pull.log. Código de salida: 0 bien, 1 error, 2 respaldo viejo.
#>
[CmdletBinding()]
param(
  [string]$Server = 'lumasystem.online',
  [string]$User = 'lumabackup',
  [string]$KeyPath = (Join-Path $env:USERPROFILE '.ssh\luma_backup'),
  [string]$Destination = 'C:\Respaldos-Luma',
  [string]$RemoteDir = '/var/backups/luma-offsite',
  [int]$Fetch = 3,
  [int]$KeepLocal = 30,
  [int]$MaxAgeHours = 30
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path $Destination | Out-Null
$logFile = Join-Path $Destination 'pull.log'

function Write-Log([string]$Message) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
  Add-Content -Path $logFile -Value $line -Encoding UTF8
  Write-Host $line
}

# Aviso visible en pantalla; si msg.exe no está disponible, queda el log.
function Send-Alert([string]$Message) {
  Write-Log "ALERTA: $Message"
  try { & msg.exe $env:USERNAME /TIME:0 "Respaldo de Luma: $Message" 2>$null } catch { }
}

$sshOpts = @('-i', $KeyPath, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20')

function Invoke-Remote([string]$Command) {
  $out = & ssh.exe @sshOpts "$User@$Server" $Command
  if ($LASTEXITCODE -ne 0) { throw "ssh falló (código $LASTEXITCODE) ejecutando: $Command" }
  return $out
}

function Get-BundleTimeUtc([string]$FileName) {
  if ($FileName -match 'luma-(\d{8}_\d{6})\.tar\.age$') {
    $t = [datetime]::ParseExact($Matches[1], 'yyyyMMdd_HHmmss', $null)
    return [datetime]::SpecifyKind($t, [System.DateTimeKind]::Utc)
  }
  return $null
}

$exitCode = 0
try {
  if (-not (Test-Path $KeyPath)) { throw "No existe la llave SSH en $KeyPath (ver README, paso C)." }

  $status = (@(Invoke-Remote "cat $RemoteDir/STATUS") -join ' ').Trim()
  Write-Log "Estado en el servidor: $status"
  if ($status -notmatch '^OK') { Send-Alert "el servidor reporta fallo al generar el respaldo: $status"; $exitCode = 1 }

  $remoteFiles = @(Invoke-Remote "ls -1t $RemoteDir/luma-*.tar.age") | Select-Object -First $Fetch
  foreach ($remote in $remoteFiles) {
    $name = ($remote -split '/')[-1]
    $local = Join-Path $Destination $name
    if (Test-Path $local) { continue }

    $part = "$local.part"
    & scp.exe @sshOpts "${User}@${Server}:$remote" $part
    if ($LASTEXITCODE -ne 0) { throw "scp falló descargando $name" }
    & scp.exe @sshOpts "${User}@${Server}:$remote.sha256" "$local.sha256"
    if ($LASTEXITCODE -ne 0) { throw "scp falló descargando $name.sha256" }

    $expected = ((Get-Content "$local.sha256" -Raw).Trim() -split '\s+')[0].ToLower()
    $actual = (Get-FileHash -Path $part -Algorithm SHA256).Hash.ToLower()
    if ($expected -ne $actual) {
      Remove-Item $part, "$local.sha256" -Force -ErrorAction SilentlyContinue
      throw "el SHA-256 de $name no coincide: descarga corrupta, se descartó"
    }
    Move-Item -Path $part -Destination $local
    Write-Log ('Descargado {0} ({1:N1} MB, SHA-256 verificado)' -f $name, ((Get-Item $local).Length / 1MB))
  }

  # Retención local
  Get-ChildItem -Path $Destination -Filter 'luma-*.tar.age' |
    Sort-Object Name -Descending | Select-Object -Skip $KeepLocal |
    ForEach-Object {
      Remove-Item $_.FullName, "$($_.FullName).sha256" -Force -ErrorAction SilentlyContinue
      Write-Log "Eliminado por retención: $($_.Name)"
    }

  # Frescura: el paquete más reciente que tenemos
  $newest = Get-ChildItem -Path $Destination -Filter 'luma-*.tar.age' | Sort-Object Name -Descending | Select-Object -First 1
  if (-not $newest) { throw 'No hay ningún paquete de respaldo en esta PC.' }
  $age = (Get-Date).ToUniversalTime() - (Get-BundleTimeUtc $newest.Name)
  Write-Log ('Último paquete local: {0} (hace {1:N1} h)' -f $newest.Name, $age.TotalHours)
  if ($age.TotalHours -gt $MaxAgeHours) {
    Send-Alert ('el último respaldo tiene {0:N0} horas ({1}). Revisa el servidor.' -f $age.TotalHours, $newest.Name)
    if ($exitCode -eq 0) { $exitCode = 2 }
  }
}
catch {
  Send-Alert "no se pudo descargar: $($_.Exception.Message)"
  $exitCode = 1
}

exit $exitCode
