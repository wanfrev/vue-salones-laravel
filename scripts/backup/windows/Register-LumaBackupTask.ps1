<#
.SYNOPSIS
  Crea la tarea programada de Windows que descarga el respaldo de Luma.

.DESCRIPTION
  Se ejecuta todos los días a la hora indicada Y cada vez que inicias sesión. "StartWhenAvailable"
  hace que, si la PC estaba apagada a esa hora, la tarea corra en cuanto se enciende. Descargar
  dos veces el mismo día no hace daño: solo baja lo que falta.
  Ejecútalo una vez:  powershell -ExecutionPolicy Bypass -File .\Register-LumaBackupTask.ps1
#>
[CmdletBinding()]
param(
  [string]$ScriptPath = (Join-Path $PSScriptRoot 'Pull-LumaBackup.ps1'),
  [string]$Time = '09:00',
  [string]$TaskName = 'Luma - descargar respaldo'
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path $ScriptPath)) { throw "No existe $ScriptPath" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument ('-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}"' -f $ScriptPath)
$triggers = @(
  (New-ScheduledTaskTrigger -Daily -At $Time),
  (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME)
)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $triggers -Settings $settings `
  -Description 'Descarga a esta PC el respaldo cifrado de Luma desde el servidor.' -Force | Out-Null

Write-Host "Tarea '$TaskName' creada: diaria a las $Time y al iniciar sesión."
Write-Host "Probarla ahora:  Start-ScheduledTask -TaskName '$TaskName'   (revisa C:\Respaldos-Luma\pull.log)"
