@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Business Hub - Antigravity Development Mode

echo ==========================================================
echo   JAI SHAKTI BUSINESS HUB - DEVELOPMENT MODE (HOT RELOAD)
echo ==========================================================
echo.
echo Starting Backend API (port 3000) + Vite Client (port 5173)...
echo Any code changes will automatically update in your browser.
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not detected. Please run SETUP-WINDOWS.bat first.
    pause
    exit /b 1
)

:: 2. Ensure dependencies and Windows native architecture
if not exist "node_modules" (
    call SETUP-WINDOWS.bat
) else (
    node -e "require('better-sqlite3')" >nul 2>&1
    if !errorlevel! neq 0 (
        echo [NOTICE] Adapting native dependencies for Windows architecture...
        call SETUP-WINDOWS.bat
    )
)

:: 3. Launch dev environment
start http://localhost:5173
call npm run dev

pause
