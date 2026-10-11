@echo off
chcp 65001 >nul
title 科研日课 · 启动
setlocal
cd /d "%~dp0"

set "PYEXE="
where python >nul 2>nul
if not errorlevel 1 set "PYEXE=python"
if defined PYEXE goto found
py -3 -c "import sys" >nul 2>nul
if not errorlevel 1 set "PYEXE=py -3"
if defined PYEXE goto found
if exist "D:\conda\python.exe" set "PYEXE=D:\conda\python.exe"
if defined PYEXE goto found
for %%p in ("%LOCALAPPDATA%\Programs\Python\Python3*\python.exe") do if exist "%%~fp" set "PYEXE=%%~fp"
if defined PYEXE goto found
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" set "PYEXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if defined PYEXE goto found

echo.
echo   [提示] 本机没找到 Python，改为直接用浏览器打开（离线模式）。
echo          离线模式下数据保存在浏览器里，清理浏览器数据会丢失记录。
echo.
start "" "%~dp0index.html"
timeout /t 5 >nul
exit /b

:found
start "科研日课·本地服务" /min cmd /c ""%PYEXE%" "%~dp0server.py""
exit /b
