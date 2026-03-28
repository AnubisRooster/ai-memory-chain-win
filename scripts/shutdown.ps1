# AI Memory Chain - Windows Shutdown Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\shutdown.ps1

$ErrorActionPreference = "Continue"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectDir "logs"
$LogFile = Join-Path $LogDir "startup.log"

function Write-Log($Message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $Message"
    if (Test-Path (Split-Path $LogFile)) {
        Add-Content -Path $LogFile -Value $line
    }
    Write-Host $line
}

Write-Log "=== AI Memory Chain shutdown ==="

# Stop via PID files
foreach ($svc in @("backend", "frontend")) {
    $pidFile = Join-Path $LogDir "$svc.pid"
    if (Test-Path $pidFile) {
        $pid = [int](Get-Content $pidFile -Raw).Trim()
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Log "Stopping $svc (PID $pid)..."
            Stop-Process -Id $pid -ErrorAction SilentlyContinue
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 3

# Force-kill anything still on our ports
foreach ($port in @(3001, 3000)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess | Select-Object -First 1
        Write-Log "Force-killing leftover process on port $port (PID $pid)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Write-Log "=== AI Memory Chain shutdown complete ==="
