@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Business Hub - Shop PC

echo ==========================================================
echo   JAI SHAKTI FARSAN MART - BUSINESS MANAGEMENT SYSTEM
echo ==========================================================
echo.

:: 1. Check Node.js runtime availability
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected on this Windows PC.
    echo Please run SETUP-WINDOWS.bat first or install Node.js LTS from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Ensure directories exist
if not exist "data" mkdir "data"
if not exist "uploads" mkdir "uploads"
if not exist "backups" mkdir "backups"
if not exist "logs" mkdir "logs"

:: 3. Setup .env configuration if not present
if not exist ".env" (
    echo Initializing configuration from .env.example...
    copy ".env.example" ".env" >nul
)

:: 4. Verify dependencies and Windows native architecture
if not exist "node_modules" (
    echo [NOTICE] First-time setup: Installing dependencies...
    call SETUP-WINDOWS.bat
) else (
    node -e "require('better-sqlite3')" >nul 2>&1
    if !errorlevel! neq 0 (
        echo [NOTICE] Adapting native dependencies for Windows architecture...
        call SETUP-WINDOWS.bat
    )
)

:: 5. Ensure production frontend build exists
if not exist "server\public\index.html" (
    echo [NOTICE] Compiling frontend assets...
    call npm run build
)

:: 6. Check for port 3000 conflict
netstat -ano | findstr :3000 | findstr LISTENING >nul 2>nul
if %errorlevel% equ 0 (
    echo [NOTICE] Jai Shakti is already running on port 3000!
    echo Opening browser to http://localhost:3000...
    start http://localhost:3000
    timeout /t 3 >nul
    exit /b 0
)

echo Starting local server on http://localhost:3000...
echo.

:: 7. Launch server process in background
set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"
set "NODE_ENV=production"

start "Jai Shakti Server" /min cmd /c "node server\index.js > logs\server.log 2>&1"

:: Wait 2 seconds for server to bind port
timeout /t 2 >nul

:: Open browser
echo Opening Jai Shakti Business Hub in browser...
start http://localhost:3000

echo ==========================================================
echo   [SUCCESS] Jai Shakti Business Hub is running!
echo   Local Address: http://localhost:3000
echo   To stop the server, run: STOP-JAI-SHAKTI.bat
echo   To create a backup, run: BACKUP-DATA.bat
echo ==========================================================
echo.
timeout /t 4 >nul
