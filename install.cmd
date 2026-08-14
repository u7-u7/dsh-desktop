@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo   DeepSeek Harness Desktop Setup
echo ============================================================
echo.

REM --- 1. locate node & npm ---
set "NODE_DIR="
for /f "delims=" %%i in ('where node 2^>nul') do if not defined NODE_DIR set "NODE_DIR=%%~dpi"
if not defined NODE_DIR (
    echo [ERROR] Node.js not found. Install from https://nodejs.org first.
    pause
    exit /b 1
)
echo [1/4] Node.js found: %NODE_DIR%node.exe

set "PATH=%NODE_DIR%;%PATH%"

REM --- 2. global dsh ---
where dsh >nul 2>&1
if errorlevel 1 (
    echo [2/4] Installing @deepseek-ai/dsh globally (mirror: npmmirror)...
    call npm i -g @deepseek-ai/dsh --registry=https://registry.npmmirror.com
    if errorlevel 1 (
        echo [ERROR] Failed to install dsh. Check your network and retry.
        pause
        exit /b 1
    )
) else (
    echo [2/4] dsh already installed.
)

REM --- 3. install electron (use npmmirror for faster download in CN) ---
echo [3/4] Installing Electron (mirror: npmmirror)...
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
call npm i --registry=https://registry.npmmirror.com
if errorlevel 1 (
    echo [ERROR] Failed to install Electron.
    pause
    exit /b 1
)

REM --- 4. create desktop shortcut ---
echo [4/4] Creating desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
if errorlevel 1 (
    echo [ERROR] Shortcut creation failed. You can create it manually:
    echo   Target:   %~dp0node_modules\electron\dist\electron.exe
    echo   Args:     "%~dp0"
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Done! Double-click "DeepSeek Harness" on your desktop.
echo ============================================================
echo.
pause
