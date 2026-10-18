@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti - Restore Data

echo ==========================================================
echo   Restore Jai Shakti Business Data from Backup
echo ==========================================================
echo.

if not exist "backups" (
    echo [ERROR] No backups directory found.
    pause
    exit /b 1
)

echo Available backups in backups\ folder:
echo.
dir /b /o-d backups\*.zip 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No .zip backup archives found in backups\ directory.
    pause
    exit /b 1
)

echo.
set /p BACKUP_FILE="Enter backup filename (e.g., jaishakti_backup_...zip): "

if not exist "backups\%BACKUP_FILE%" (
    echo [ERROR] File backups\%BACKUP_FILE% does not exist!
    pause
    exit /b 1
)

echo.
echo [WARNING] Restoring will replace the current active database with the backup.
echo A safety backup of your current database will be created automatically first.
echo.
set /p CONFIRM="Are you sure you want to proceed? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Restore cancelled.
    pause
    exit /b 0
)

node server\scripts\restore-cli.js "%BACKUP_FILE%"

echo.
pause
