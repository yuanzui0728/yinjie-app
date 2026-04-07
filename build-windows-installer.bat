@echo off
setlocal EnableExtensions

cd /d "%~dp0"
node ".\scripts\build-windows-installers.mjs" %*
exit /b %ERRORLEVEL%
