# AI Memory Chain - Windows Startup Script (PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\startup.ps1

$ErrorActionPreference = "Continue"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectDir "logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$LogFile = Join-Path $LogDir "startup.log"

function Write-Log($Message) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

function Wait-ForUrl($Url, $Label, $MaxAttempts = 30, $Method = "GET") {
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            if ($Method -eq "POST") {
                Invoke-WebRequest -Uri $Url -Method POST -TimeoutSec 5 -ErrorAction Stop | Out-Null
            } else {
                Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -ErrorAction Stop | Out-Null
            }
            return $true
        } catch {
            Start-Sleep -Seconds 2
        }
    }
    Write-Log "WARNING: $Label not responding after $($MaxAttempts * 2)s."
    return $false
}

function Stop-ProcessOnPort($Port) {
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        $pid = $conn.OwningProcess | Select-Object -First 1
        Write-Log "Killing stale process on port $Port (PID $pid)"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

Write-Log "=== AI Memory Chain startup begin ==="

# ── Docker ──────────────────────────────────────────────────────
Write-Log "Waiting for Docker daemon..."
$attempts = 0
while ($true) {
    try {
        docker info 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
    } catch {}
    $attempts++
    if ($attempts -ge 60) {
        Write-Log "ERROR: Docker not ready after 2 min."
        exit 1
    }
    if ($attempts % 10 -eq 0) { Write-Log "Waiting for Docker... ($attempts/60)" }
    Start-Sleep -Seconds 2
}
Write-Log "Docker daemon is ready."

Set-Location $ProjectDir
docker compose up -d 2>&1 | Out-File -Append (Join-Path $LogDir "docker.log")
Write-Log "Docker containers started."

# ── Infrastructure health gates ─────────────────────────────────
Wait-ForUrl "http://localhost:8545" "Polygon Edge" 30
Write-Log "Polygon Edge is ready."

Wait-ForUrl "http://localhost:5001/api/v0/id" "IPFS" 15 "POST"
Write-Log "IPFS is ready."

# ── Kill stale processes ────────────────────────────────────────
Stop-ProcessOnPort 3001
Stop-ProcessOnPort 3000

# ── Environment ─────────────────────────────────────────────────
$deploymentJson = Join-Path $ProjectDir "deployment.json"
if (Test-Path $deploymentJson) {
    $deployment = Get-Content $deploymentJson | ConvertFrom-Json
    $env:CONTRACT_ADDRESS = $deployment.address
} else {
    Write-Log "WARNING: deployment.json not found."
}

$validatorKey = Join-Path $ProjectDir "data\polygon-edge\node1\consensus\validator.key"
if (Test-Path $validatorKey) {
    $key = (Get-Content $validatorKey -Raw).Trim()
    if (-not $key.StartsWith("0x")) { $key = "0x$key" }
    $env:DEPLOYER_PRIVATE_KEY = $key
}

# ── Rebuild backend if needed ───────────────────────────────────
$backendDist = Join-Path $ProjectDir "backend\dist\index.js"
$needsBuild = -not (Test-Path $backendDist)
if (-not $needsBuild) {
    $distTime = (Get-Item $backendDist).LastWriteTime
    $newerSrc = Get-ChildItem -Path (Join-Path $ProjectDir "backend\src") -Filter "*.ts" -Recurse |
        Where-Object { $_.LastWriteTime -gt $distTime } | Select-Object -First 1
    if ($newerSrc) { $needsBuild = $true }
}

if ($needsBuild) {
    Write-Log "Backend source newer than dist - rebuilding..."
    Set-Location (Join-Path $ProjectDir "backend")
    npx tsc 2>&1 | Out-File -Append (Join-Path $LogDir "backend.log")
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Backend rebuild succeeded."
    } else {
        Write-Log "ERROR: Backend rebuild failed - starting with stale dist."
    }
}

# ── Rebuild frontend if needed ──────────────────────────────────
$buildId = Join-Path $ProjectDir "frontend\.next\BUILD_ID"
if (-not (Test-Path $buildId)) {
    Write-Log "Frontend BUILD_ID missing - rebuilding..."
    Set-Location (Join-Path $ProjectDir "frontend")
    npx next build 2>&1 | Out-File -Append (Join-Path $LogDir "frontend.log")
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Frontend rebuild succeeded."
    } else {
        Write-Log "ERROR: Frontend rebuild failed."
        exit 1
    }
}

# ── Start backend ───────────────────────────────────────────────
Set-Location (Join-Path $ProjectDir "backend")
$backendProc = Start-Process -FilePath "node" -ArgumentList "dist\index.js" `
    -WorkingDirectory (Join-Path $ProjectDir "backend") `
    -RedirectStandardOutput (Join-Path $LogDir "backend-stdout.log") `
    -RedirectStandardError (Join-Path $LogDir "backend-stderr.log") `
    -PassThru -NoNewWindow

$backendProc.Id | Out-File (Join-Path $LogDir "backend.pid") -NoNewline
Write-Log "Backend started (PID $($backendProc.Id))"

Start-Sleep -Seconds 2
if ($backendProc.HasExited) {
    Write-Log "ERROR: Backend process exited immediately."
    exit 1
}

Wait-ForUrl "http://localhost:3001/health" "Backend" 10
Write-Log "Backend health check passed."

# ── Start frontend ──────────────────────────────────────────────
Set-Location (Join-Path $ProjectDir "frontend")
$frontendProc = Start-Process -FilePath "npx" -ArgumentList "next start --port 3000 --hostname 0.0.0.0" `
    -WorkingDirectory (Join-Path $ProjectDir "frontend") `
    -RedirectStandardOutput (Join-Path $LogDir "frontend-stdout.log") `
    -RedirectStandardError (Join-Path $LogDir "frontend-stderr.log") `
    -PassThru -NoNewWindow

$frontendProc.Id | Out-File (Join-Path $LogDir "frontend.pid") -NoNewline
Write-Log "Frontend started (PID $($frontendProc.Id))"

Start-Sleep -Seconds 3
if ($frontendProc.HasExited) {
    Write-Log "ERROR: Frontend process exited immediately."
    exit 1
}

Wait-ForUrl "http://localhost:3000" "Frontend" 10
Write-Log "Frontend health check passed."

Write-Log "=== AI Memory Chain startup complete ==="
Write-Log "  Backend:  http://localhost:3001  (PID $($backendProc.Id))"
Write-Log "  Frontend: http://localhost:3000  (PID $($frontendProc.Id))"

# Keep the script running so Task Scheduler doesn't think it's done
Wait-Process -Id $backendProc.Id, $frontendProc.Id
