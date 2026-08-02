# Luma Scheduler Trigger
# Use with Windows Task Scheduler to run every minute:
# Program: powershell.exe
# Arguments: -ExecutionPolicy Bypass -File "C:\path\to\backend\storage\scheduler\trigger.ps1"
# Start in: C:\path\to\backend

param()

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Resolve-Path "$scriptDir\..\.."
$logDir = "$scriptDir\logs"

if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

$logFile = "$logDir\scheduler_$(Get-Date -Format 'yyyyMMdd').log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

try {
    Set-Location $backendDir
    $output = & php artisan schedule:run --no-interaction 2>&1
    $outputStr = ($output | Out-String).Trim()

    if ($outputStr) {
        "$timestamp | $outputStr" | Out-File -Append -FilePath $logFile -Encoding utf8
    }
} catch {
    "$timestamp | ERROR: $_" | Out-File -Append -FilePath $logFile -Encoding utf8
}
