@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Business Hub - Windows Setup

echo ==========================================================
echo   JAI SHAKTI BUSINESS HUB - WINDOWS ENVIRONMENT SETUP
echo ==========================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this Windows PC.
    echo.
    echo Please install Node.js LTS (v20 or v22) from:
    echo https://nodejs.org/
    echo.
    echo Opening download website in your browser...
    start https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Node.js detected:
node -v
npm -v
echo.

:: 2. Ensure persistent storage folders exist
echo [2/5] Checking project directories...
if not exist "data" mkdir "data"
if not exist "uploads" mkdir "uploads"
if not exist "backups" mkdir "backups"
if not exist "logs" mkdir "logs"

:: 3. Setup .env configuration
if not exist ".env" (
    echo Initializing configuration from .env.example...
    copy ".env.example" ".env" >nul
)

:: 4. Install / Rebuild dependencies for Windows
echo [3/5] Installing project dependencies for Windows...
call npm install

echo [4/5] Testing native database module (better-sqlite3)...
node -e "try { const DB = require('better-sqlite3'); console.log('[SUCCESS] Database driver verified.'); } catch (e) { process.exit(1); }" >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTICE] Rebuilding native binary for Windows architecture...
    call npm rebuild better-sqlite3 sharp
    node -e "try { const DB = require('better-sqlite3'); } catch (e) { process.exit(1); }" >nul 2>&1
    if %errorlevel% neq 0 (
        echo [RETRY] Running clean native install...
        call npm install better-sqlite3 sharp --force
    )
)

:: 5. Run database migrations
echo [5/5] Checking and applying database migrations...
set "DB_PATH=%~dp0data\jaishakti.sqlite"
node server/db/migrate.js

:: 6. Ensure frontend build is ready for 1-click production launch
if not exist "server\public\index.html" (
    echo Building frontend production bundle...
    call npm run build
)

echo.
echo ==========================================================
echo   [SUCCESS] Jai Shakti Business Hub is ready on Windows!
echo.
echo   To launch the app for shop operations:
echo     Double-click: START-JAI-SHAKTI.bat
echo.
echo   To develop in Antigravity with live hot-reload:
echo     Double-click: START-DEV.bat
echo ==========================================================
echo.
pause
