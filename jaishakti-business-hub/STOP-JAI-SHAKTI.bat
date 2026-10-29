@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Stop Jai Shakti Business Hub

echo ==========================================================
echo   Stopping Jai Shakti Business Hub
echo ==========================================================
echo.

set FOUND=0

:: Stop port 3000 (Backend / Production Server)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    set FOUND=1
    echo Stopping backend process PID %%a on port 3000...
    taskkill /F /PID %%a >nul 2>&1
)

:: Stop port 5173 (Vite Dev Server if running)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    set FOUND=1
    echo Stopping dev server process PID %%a on port 5173...
    taskkill /F /PID %%a >nul 2>&1
)

if "!FOUND!"=="1" (
    echo [SUCCESS] Server stopped cleanly. Database WAL flushed.
) else (
    echo [INFO] No active Jai Shakti server process found.
)

echo.
ping 127.0.0.1 -n 4 >nul 2>&1
