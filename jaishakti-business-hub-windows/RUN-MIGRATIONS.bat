@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Jai Shakti - Apply Migrations

echo ==========================================================
echo   Applying Database Schema Migrations
echo ==========================================================
echo.

set "DATA_DIR=%~dp0data"
set "DB_PATH=%~dp0data\jaishakti.sqlite"

node "%~dp0app\server\db\migrate.js"

echo.
pause
