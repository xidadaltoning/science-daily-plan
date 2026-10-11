@echo off
chcp 65001 >nul
title 科研日课 · 停止服务
setlocal
cd /d "%~dp0"
set "PIDFILE=%~dp0data\server.pid"

if not exist "%PIDFILE%" goto nothing
set /p PID=<"%PIDFILE%"
if "%PID%"=="" goto nothing

echo 正在停止科研日课本地服务（PID %PID%）...
taskkill /pid %PID% /f >nul 2>nul
if errorlevel 1 (echo 服务可能已经关闭。) else (echo 已停止，数据已保存到 data 文件夹。)
del "%PIDFILE%" >nul 2>nul
timeout /t 2 >nul
exit /b

:nothing
echo 当前没有正在运行的科研日课服务。
timeout /t 3 >nul
exit /b
