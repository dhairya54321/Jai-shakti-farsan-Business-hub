@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti - Create Backup

echo ==========================================================
echo   Creating Jai Shakti Business Data Backup
echo ==========================================================
echo.

if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
node server\scripts\backup-cli.js

echo.
echo Backup archive saved inside the backups\ folder.
echo You can copy this file to an external pen drive for safekeeping.
echo.
pause
