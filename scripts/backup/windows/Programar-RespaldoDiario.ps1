<#
.SYNOPSIS
  Programa en Windows la descarga automática del respaldo de Luma (se hace UNA vez).

.DESCRIPTION
  Copia Respaldo-Rapido.ps1 a C:\Luma-Backup (fuera del repositorio y de OneDrive, para que la tarea no
  dependa de ellos) y crea una tarea programada que corre todos los días a la hora indicada Y cada vez
  que inicias sesión. Si la PC estaba apagada a esa hora, la tarea corre en cuanto se enciende. Si ya
  hay un respaldo de hace menos de 12 horas no descarga otro, así que iniciar sesión varias veces no
  repite la descarga.

  Requiere haber ejecutado antes Autorizar-LlaveRespaldo.ps1.

  Uso:  powershell -ExecutionPolicy Bypass -File .\Programar-RespaldoDiario.ps1 -RunNow
#>
[CmdletBinding()]
param(
  [string]$Time = '09:00',
  [string]$TaskName = 'Luma - respaldo diario',
  [string]$InstallDir = 'C:\Luma-Backup',
  [string]$Destination = 'C:\Respaldos-Luma',
  [string]$KeyFile = (Join-Path $env:USERPROFILE '.ssh\luma_backup'),
  [int]$Keep = 14,
  [switch]$RunNow
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $KeyFile)) { throw "No existe la llave $KeyFile. Ejecuta primero Autorizar-LlaveRespaldo.ps1." }
if ($Destination -match 'OneDrive') {
  Write-Warning "La carpeta de destino ($Destination) está dentro de OneDrive. El respaldo NO va cifrado y trae el .env (claves y contraseñas): si OneDrive se activa, se subirá a la nube de Microsoft."
}

New-Item -ItemType Directory -Force -Path $InstallDir, $Destination | Out-Null
$script = Join-Path $InstallDir 'Respaldo-Rapido.ps1'
Copy-Item -Path (Join-Path $PSScriptRoot 'Respaldo-Rapido.ps1') -Destination $script -Force

$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -Unattended -KeyFile "{1}" -Destination "{2}" -Keep {3} -MinHours 12' -f $script, $KeyFile, $Destination, $Keep
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$triggers = @(
  (New-ScheduledTaskTrigger -Daily -At $Time),
  (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -RunOnlyIfNetworkAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings `
  -Description 'Descarga a esta PC el respaldo de Luma (base de datos, WhatsApp, .env y archivos subidos).' -Force | Out-Null

Write-Host "Tarea '$TaskName' creada: diaria a las $Time y al iniciar sesión."
Write-Host "  Respaldos en : $Destination  (se conservan los últimos $Keep)"
Write-Host "  Registro     : $Destination\respaldo.log"
if ($RunNow) {
  Write-Host 'Ejecutándola ahora (tarda unos minutos)...'
  Start-ScheduledTask -TaskName $TaskName
} else {
  Write-Host "Probarla ahora:  Start-ScheduledTask -TaskName '$TaskName'"
}
