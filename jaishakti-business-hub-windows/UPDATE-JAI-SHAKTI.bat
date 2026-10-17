@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Update Jai Shakti Business Hub

echo ==========================================================
echo   Safe Application Update - Jai Shakti Business Hub
echo ==========================================================
echo.
echo This utility safely updates application code without touching:
echo  - Live database (data\)
echo  - Uploaded receipts (uploads\)
echo  - Previous backups (backups\)
echo  - Configuration (.env)
echo.

:: 1. Stop active server if running
echo [1/4] Stopping active server instances...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: 2. Pre-update safety backup
echo [2/4] Creating pre-update safety backup...
set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"

node "%~dp0app\server\scripts\backup-cli.js"

:: 3. Check for update source
if "%~1"=="" (
    echo.
    echo To apply an update, place the new 'app' folder or specify its path.
    echo Usage: UPDATE-JAI-SHAKTI.bat "D:\Updates\app"
    echo.
    pause
    exit /b 0
)

set "UPDATE_SRC=%~1"
if not exist "%UPDATE_SRC%" (
    echo [ERROR] Update source path does not exist: %UPDATE_SRC%
    pause
    exit /b 1
)

echo [3/4] Updating application files from %UPDATE_SRC%...
xcopy "%UPDATE_SRC%" "%~dp0app" /E /I /Y /Q >nul

:: 4. Run any new migrations
echo [4/4] Applying any new database migrations...
node "%~dp0app\server\db\migrate.js"

echo.
echo ==========================================================
echo   [SUCCESS] Application updated successfully!
echo   Your live business database and receipts were preserved.
echo   To launch the new version, double-click START-JAI-SHAKTI.bat
echo ==========================================================
echo.
pause
