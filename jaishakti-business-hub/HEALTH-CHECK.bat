@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Health Check

echo ==========================================================
echo   Jai Shakti System Health Check
echo ==========================================================
echo.

node server\scripts\health-cli.js

echo.
pause
