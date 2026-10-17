@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti Health Check

echo ==========================================================
echo   Jai Shakti System Health Check
echo ==========================================================
echo.

set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"

node "%~dp0app\server\scripts\health-cli.js"

echo.
pause
