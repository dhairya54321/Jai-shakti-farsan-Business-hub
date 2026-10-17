@echo off
setlocal enabledelayedexpansion

:: Switch to script's own directory regardless of where it was launched from
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
    echo.
    echo Please install Node.js LTS (v20 or v22) to run Jai Shakti Business Hub.
    echo Download: https://nodejs.org/
    echo.
    echo Opening download website in your browser...
    start https://nodejs.org/
    pause
    exit /b 1
)

:: 2. Ensure persistent storage folders exist outside app/
if not exist "data" mkdir "data"
if not exist "uploads" mkdir "uploads"
if not exist "backups" mkdir "backups"
if not exist "logs" mkdir "logs"

:: 3. Setup .env configuration if not present
if not exist ".env" (
    echo Initializing configuration from .env.example...
    copy ".env.example" ".env" >nul
)

:: 4. Verify dependencies
if not exist "app\node_modules" (
    echo [NOTICE] First-time setup: Installing dependencies...
    echo (This only happens on the very first run, please wait a minute)
    cd /d "%~dp0app"
    call npm install --omit=dev
    cd /d "%~dp0"
)

:: 5. Apply migrations & seed if database is new
if not exist "data\jaishakti.sqlite" (
    echo [NOTICE] Initializing business database and categories...
    cd /d "%~dp0app"
    set "DB_PATH=%~dp0data\jaishakti.sqlite"
    node server/db/migrate.js
    node server/db/seed.js
    cd /d "%~dp0"
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

:: 7. Launch server process
set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"
set "NODE_ENV=production"

start "Jai Shakti Server" /min cmd /c "node "%~dp0app\server\index.js" > "%~dp0logs\server.log" 2>&1"

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
