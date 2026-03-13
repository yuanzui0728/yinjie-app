@echo off
chcp 65001 >nul
title 隐界 APP
set ROOT=%~dp0

echo.
echo  隐界 APP — 启动中
echo  ----------------------------------------

:: 释放端口
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 1 /nobreak >nul

if not exist "%ROOT%logs" mkdir "%ROOT%logs"

:: 后台启动三个服务，日志写文件
start /b cmd /c "cd /d "%ROOT%api" && npm run start:dev > "%ROOT%logs\api.log" 2>&1"
start /b cmd /c "cd /d "%ROOT%web" && npm run dev > "%ROOT%logs\web.log" 2>&1"
start /b cmd /c "cd /d "%ROOT%admin" && npm run dev > "%ROOT%logs\admin.log" 2>&1"

echo  [1/3] 后端启动中...
:wait_api
timeout /t 2 /nobreak >nul
curl -s http://localhost:3000/api/characters >nul 2>&1
if errorlevel 1 goto wait_api

echo  [2/3] 前端启动中...
:wait_web
timeout /t 1 /nobreak >nul
curl -s http://localhost:5174 >nul 2>&1
if errorlevel 1 goto wait_web

echo  [3/3] 就绪
echo.
echo  ========================================
echo   H5 前端    http://localhost:5174
echo   管理后台   http://localhost:5173
echo   后端 API   http://localhost:3000/api
echo  ========================================
echo.
echo  日志：logs\api.log / web.log / admin.log
echo  关闭服务请运行 stop.bat
echo  按任意键关闭此窗口（服务继续运行）
pause >nul
