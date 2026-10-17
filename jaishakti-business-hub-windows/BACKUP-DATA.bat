@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti - Create Backup

echo ==========================================================
echo   Creating Jai Shakti Business Data Backup
echo ==========================================================
echo.

set "DATA_DIR=%~dp0data"
set "UPLOADS_DIR=%~dp0uploads"
set "BACKUP_DIR=%~dp0backups"
set "LOG_DIR=%~dp0logs"
set "DB_PATH=%~dp0data\jaishakti.sqlite"

node "%~dp0app\server\scripts\backup-cli.js"

echo.
echo Backup archive saved inside the backups\ folder.
echo You can copy this file to an external pen drive for safekeeping.
echo.
pause
