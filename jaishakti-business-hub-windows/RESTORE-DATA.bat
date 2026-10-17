@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti - Restore Data Backup

echo ==========================================================
echo   Restore Data Backup - Jai Shakti Business Hub
echo ==========================================================
echo.
echo WARNING: Restoring replaces the current database.
echo A safety backup will be created automatically before restoring.
echo.

set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"

:: If a file was dragged-and-dropped or passed as argument
if "%~1" neq "" (
    node "%~dp0app\server\scripts\restore-cli.js" "%~nx1"
    pause
    exit /b 0
)

:: Otherwise list backups
node "%~dp0app\server\scripts\restore-cli.js"

echo.
set /p BACKUP_NAME="Enter the exact backup filename to restore (e.g. jaishakti_backup_...zip): "

if "%BACKUP_NAME%"=="" (
    echo [CANCELLED] No backup file specified.
    pause
    exit /b 0
)

node "%~dp0app\server\scripts\restore-cli.js" "%BACKUP_NAME%"

echo.
pause
