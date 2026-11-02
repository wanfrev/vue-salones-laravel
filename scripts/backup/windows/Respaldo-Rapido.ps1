<#
.SYNOPSIS
  Baja a esta PC una copia de todo lo importante de Luma, en un solo archivo.

.DESCRIPTION
  Una sola conexión SSH al servidor. No instala ni cambia nada allá: solo lee. Guarda en
  C:\Respaldos-Luma un archivo luma-AAAAMMDD-HHMM.tar.gz con:
    - el dump más reciente de la base de producción (salones) y el de WhatsApp (evolution_db)
      (los genera el cron de las 03:00 del servidor: tienen como máximo ~24 horas)
    - el .env del backend (trae el APP_KEY: sin él NO se pueden leer las notas y adjuntos
      clínicos cifrados, aunque tengas la base)
    - storage/app (los archivos subidos)
  Verifica que el archivo se pueda abrir y que traiga la base, el WhatsApp y el .env. Conserva
  los últimos 10 y borra los más viejos.

  OJO: el archivo NO va cifrado y contiene datos clínicos, financieros y claves. Guárdalo solo
  en una carpeta fuera de OneDrive y con BitLocker activado en el disco.

  Uso:  powershell -ExecutionPolicy Bypass -File .\Respaldo-Rapido.ps1
#>
[CmdletBinding()]
param(
  [string]$Server = 'lumasystem.online',
  [string]$User = 'root',
  [string]$Destination = 'C:\Respaldos-Luma',
  [int]$Keep = 10,
  [string]$SshExe = 'ssh.exe',
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'

# Todo se arma en el servidor y viaja por la misma conexión como un .tar.gz (-h sigue enlaces).
$remoteCmd = 'cd /var/www/vue-salones-laravel/backend && tar -czhf - .env storage/app ' +
  '$(ls -t /var/backups/postgres/salones_2*.dump | head -1) ' +
  '$(ls -t /var/backups/postgres/evolution_db_2*.dump | head -1)'

# Se copia el flujo byte a byte: el operador > de Windows PowerShell corrompería un archivo binario.
function Save-RemoteStream([string]$Arguments, [string]$OutFile) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $SshExe
  $psi.Arguments = $Arguments
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $proc = [System.Diagnostics.Process]::Start($psi)
  $fs = [System.IO.File]::Create($OutFile)
  try { $proc.StandardOutput.BaseStream.CopyTo($fs) } finally { $fs.Dispose() }
  $proc.WaitForExit()
  return $proc.ExitCode
}

function Stop-WithError([string]$Message, [string]$PartFile) {
  if ($PartFile) { Remove-Item $PartFile -Force -ErrorAction SilentlyContinue }
  throw $Message
}

$exitCode = 0
try {
  New-Item -ItemType Directory -Force -Path $Destination | Out-Null
  $final = Join-Path $Destination ('luma-{0}.tar.gz' -f (Get-Date -Format 'yyyyMMdd-HHmm'))
  $part = "$final.part"

  Write-Host "Descargando desde $User@$Server ... (si pide contraseña, escríbela)"
  $sshArgs = '-o ConnectTimeout=20 {0}@{1} "{2}"' -f $User, $Server, $remoteCmd
  $code = Save-RemoteStream $sshArgs $part
  if ($code -ne 0) { Stop-WithError "La conexión con el servidor falló (código $code)." $part }

  $size = (Get-Item $part).Length
  if ($size -lt 100KB) { Stop-WithError ('La descarga llegó casi vacía ({0} bytes).' -f $size) $part }

  $list = @(& tar.exe -tzf $part)
  if ($LASTEXITCODE -ne 0) { Stop-WithError 'El archivo descargado está dañado: no se puede abrir.' $part }

  $dump = @($list | Where-Object { $_ -match 'salones_2\d{7}_\d{6}\.dump$' })
  $evo = @($list | Where-Object { $_ -match 'evolution_db_2\d{7}_\d{6}\.dump$' })
  $env = @($list | Where-Object { $_ -eq '.env' })
  $missing = @()
  if ($dump.Count -eq 0) { $missing += 'el dump de la base (salones)' }
  if ($evo.Count -eq 0) { $missing += 'el dump de WhatsApp (evolution_db)' }
  if ($env.Count -eq 0) { $missing += 'el .env' }
  if ($missing.Count -gt 0) { Stop-WithError ('El archivo descargado no trae: ' + ($missing -join ', ') + '.') $part }

  Move-Item -Path $part -Destination $final

  Get-ChildItem -Path $Destination -Filter 'luma-*.tar.gz' | Sort-Object Name -Descending |
    Select-Object -Skip $Keep | ForEach-Object {
      Remove-Item $_.FullName -Force
      Write-Host "Borrado por antiguo: $($_.Name)"
    }

  $m = [regex]::Match($dump[0], 'salones_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})')
  Write-Host ''
  Write-Host 'LISTO' -ForegroundColor Green
  Write-Host ('  Archivo : {0}  ({1:N1} MB)' -f $final, ($size / 1MB))
  Write-Host ('  Base de datos de: {0}-{1}-{2} {3}:{4} (hora del servidor)' -f $m.Groups[1].Value, $m.Groups[2].Value, $m.Groups[3].Value, $m.Groups[4].Value, $m.Groups[5].Value)
  Write-Host '  Incluye: base de producción, WhatsApp, .env (APP_KEY) y archivos subidos.'
  Write-Host '  Recuerda: guárdalo fuera de OneDrive y con BitLocker activado.'
}
catch {
  Write-Host ''
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  $exitCode = 1
}

if (-not $NoPause -and $Host.Name -eq 'ConsoleHost') { Read-Host 'Pulsa Enter para cerrar' | Out-Null }
exit $exitCode
