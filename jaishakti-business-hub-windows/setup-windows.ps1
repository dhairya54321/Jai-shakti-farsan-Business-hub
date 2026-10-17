# Jai Shakti Business Hub - Automated Windows Setup Script
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  Jai Shakti Business Hub — Automated Windows Setup" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host ""

$CurrentDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Verify Node.js
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js was not found on PATH." -ForegroundColor Red
    Write-Host "Please install Node.js LTS (v20 or newer) from https://nodejs.org/"
    Start-Process "https://nodejs.org/"
    exit 1
}

# 2. Ensure directories exist
$dirs = @("data", "uploads", "backups", "logs")
foreach ($dir in $dirs) {
    $targetPath = Join-Path $CurrentDir $dir
    if (-not (Test-Path $targetPath)) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        Write-Host "[OK] Created directory: $dir" -ForegroundColor Green
    }
}

# 3. Environment configuration
$envFile = Join-Path $CurrentDir ".env"
$envExample = Join-Path $CurrentDir ".env.example"
if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] Initialized .env from .env.example" -ForegroundColor Green
}

# 4. Create Desktop Shortcut
try {
    $WshShell = New-Object -ComObject WScript.Shell
    $DesktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
    $ShortcutPath = Join-Path $DesktopPath "Jai Shakti Business Hub.lnk"
    $Shortcut = $WshShell.CreateShortcut($ShortcutPath)
    $Shortcut.TargetPath = Join-Path $CurrentDir "START-JAI-SHAKTI.bat"
    $Shortcut.WorkingDirectory = $CurrentDir
    $Shortcut.Description = "Launch Jai Shakti Farsan Mart Business Hub"
    $Shortcut.Save()
    Write-Host "[OK] Created Desktop Shortcut: 'Jai Shakti Business Hub'" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Desktop shortcut creation skipped." -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] Windows setup is complete!" -ForegroundColor Green
Write-Host "  Double-click 'START-JAI-SHAKTI.bat' to start the application." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
