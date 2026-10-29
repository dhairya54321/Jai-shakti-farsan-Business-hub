@echo off
if exist "%LOCALAPPDATA%\Programs\nodejs" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
cd /d "%~dp0jaishakti-business-hub"
call STOP-JAI-SHAKTI.bat %*
