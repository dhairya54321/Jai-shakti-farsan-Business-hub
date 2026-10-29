@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Health Check

echo ==========================================================
echo   Jai Shakti System Health Check
echo ==========================================================
echo.

if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
node server\scripts\health-cli.js

echo.
pause
