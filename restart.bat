@echo off
chcp 65001 >nul
title 隐界 APP — 重启

echo.
echo  隐界 APP — 重启服务
echo  ----------------------------------------

:: 停止所有服务
echo  [1/2] 停止现有服务...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

:: 启动所有服务
echo  [2/2] 启动服务...
call "%~dp0start.bat"
