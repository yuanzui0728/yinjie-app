@echo off
chcp 65001 >nul
title 隐界 APP — 停止

echo.
echo  隐界 APP — 停止服务中...
echo  ----------------------------------------

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING" 2^>nul') do (
  echo  停止后端 PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174 " ^| findstr "LISTENING" 2^>nul') do (
  echo  停止前端 PID %%a
  taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
  echo  停止管理后台 PID %%a
  taskkill /F /PID %%a >nul 2>&1
)

:: 清理残留 node 进程（只杀占用这三个端口的）
echo.
echo  所有服务已停止
echo  按任意键关闭
pause >nul
