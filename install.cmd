@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo   DeepSeek Harness Desktop - One-click Installer
echo   Auto-installs Node.js + dsh + Electron on a fresh PC
echo ============================================================
echo.

REM ===== Step 1: ensure Node.js is available (auto-install if missing) =====
set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"

if not defined NODE_EXE (
    echo [1/5] Node.js not found. Trying to install via winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to auto-install Node.js. Please install it manually:
        echo   1. Open https://nodejs.org in your browser
        echo   2. Download the LTS Windows Installer (.msi)
        echo   3. Install it, then run this script again
        pause
        exit /b 1
    )
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
)

if not defined NODE_EXE (
    echo [ERROR] node.exe still not found. Install Node.js manually and retry.
    pause
    exit /b 1
)

REM node.exe was found by 'where', so its directory is already on PATH.
REM No need to extract the directory; just ensure npm's global bin is on PATH too.
echo [1/5] Node.js: %NODE_EXE%
set "PATH=%APPDATA%\npm;%PATH%"

REM ===== Step 2: ensure @deepseek-ai/dsh is installed globally =====
REM Check the real global dir (npm root -g); never trust 'where dsh'
REM because a stale npx cache would pass that check.
set "DSH_GLOBAL="
for /f "delims=" %%i in ('npm root -g 2^>nul') do set "DSH_GLOBAL=%%i"
set "DSH_INSTALLED=0"
if defined DSH_GLOBAL if exist "%DSH_GLOBAL%\@deepseek-ai\dsh\package.json" set "DSH_INSTALLED=1"
if "%DSH_INSTALLED%"=="1" (
    echo [2/5] @deepseek-ai/dsh already installed.
) else (
    echo [2/5] Installing @deepseek-ai/dsh globally (npmmirror mirror)...
    call npm i -g @deepseek-ai/dsh --registry=https://registry.npmmirror.com
    if errorlevel 1 (
        echo [ERROR] Failed to install @deepseek-ai/dsh. Check your network and retry.
        pause
        exit /b 1
    )
)

REM ===== Step 3: install Electron (project dependency) =====
echo [3/5] Installing Electron (npmmirror mirror, ~100MB, please wait)...
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm i --registry=https://registry.npmmirror.com
if errorlevel 1 (
    echo [ERROR] Failed to install Electron. Check your network and retry.
    pause
    exit /b 1
)

REM ===== Step 4: verify Electron binary, re-download if missing =====
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo [4/5] electron.exe missing. Re-triggering binary download...
    node "%~dp0node_modules\electron\install.js"
    if not exist "%~dp0node_modules\electron\dist\electron.exe" (
        echo [ERROR] Electron binary still missing.
        echo Manual fix (see README "Electron binary download failed"):
        echo   1. Download electron-vXX-win32-x64.zip
        echo   2. Extract it into node_modules\electron\dist\
        echo   3. Create node_modules\electron\path.txt containing: electron.exe
        pause
        exit /b 1
    )
) else (
    echo [4/5] Electron binary ready.
)

REM ===== Step 5: create desktop shortcut =====
echo [5/5] Creating desktop shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
if errorlevel 1 (
    echo [ERROR] Shortcut creation failed. Create it manually:
    echo   Target:   %~dp0node_modules\electron\dist\electron.exe
    echo   Args:     "%~dp0"
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Done! Double-click "DeepSeek Harness" on your desktop.
echo   First use: enter your DeepSeek API Key in Settings.
echo ============================================================
echo.
pause
