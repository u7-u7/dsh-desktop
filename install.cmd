@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ============================================================
echo   DeepSeek Harness Desktop - 一键安装
echo   全新电脑也能用：自动安装 Node.js + dsh + Electron
echo ============================================================
echo.

REM ============ 第 1 步：确保 Node.js 可用（没有就自动装） ============
set "NODE_EXE="
for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"

if not defined NODE_EXE (
    echo [1/5] 未检测到 Node.js，尝试用 winget 自动安装 LTS 版本...
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements --silent
    if errorlevel 1 (
        echo.
        echo [ERROR] Node.js 自动安装失败。请手动安装：
        echo   1. 浏览器打开 https://nodejs.org
        echo   2. 下载 LTS 版 Windows Installer (.msi)
        echo   3. 安装完成后重新运行本脚本
        pause
        exit /b 1
    )
    REM winget 装完后把 Node 默认目录加进 PATH 并重新定位
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
    for /f "delims=" %%i in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%i"
)

if not defined NODE_EXE (
    echo [ERROR] 仍然找不到 node.exe，请手动安装 Node.js 后重试。
    pause
    exit /b 1
)

for %%i in ("%NODE_EXE%") do set "NODE_DIR=%%~dpi"
echo [1/5] Node.js: %NODE_EXE%
set "PATH=%NODE_DIR%;%APPDATA%\npm;%PATH%"

REM ============ 第 2 步：确保全局装有 @deepseek-ai/dsh ============
REM 用 npm root -g 定位全局目录，再检查包目录是否存在。
REM 不用 where dsh（会误判 npx 临时缓存），也不用 npm ls（对缺失包返回码不可靠）。
set "DSH_GLOBAL="
for /f "delims=" %%i in ('npm root -g 2^>nul') do set "DSH_GLOBAL=%%i"
set "DSH_INSTALLED=0"
if defined DSH_GLOBAL if exist "%DSH_GLOBAL%\@deepseek-ai\dsh\package.json" set "DSH_INSTALLED=1"
if "%DSH_INSTALLED%"=="1" (
    echo [2/5] @deepseek-ai/dsh 已安装。
) else (
    echo [2/5] 未安装 @deepseek-ai/dsh，正在全局安装（npmmirror 镜像）...
    call npm i -g @deepseek-ai/dsh --registry=https://registry.npmmirror.com
    if errorlevel 1 (
        echo [ERROR] @deepseek-ai/dsh 安装失败，请检查网络后重试。
        pause
        exit /b 1
    )
)

REM ============ 第 3 步：安装 Electron（项目依赖） ============
echo [3/5] 安装 Electron（npmmirror 镜像，约 100MB，请稍候）...
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
call npm i --registry=https://registry.npmmirror.com
if errorlevel 1 (
    echo [ERROR] Electron 安装失败，请检查网络后重试。
    pause
    exit /b 1
)

REM ============ 第 4 步：校验 Electron 二进制，缺失则重新下载 ============
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
    echo [4/5] electron.exe 未生成，重新触发二进制下载...
    node "%~dp0node_modules\electron\install.js"
    if not exist "%~dp0node_modules\electron\dist\electron.exe" (
        echo [ERROR] Electron 二进制仍缺失。
        echo 请手动处理（详见 README「如果 Electron 二进制下载失败」）：
        echo   1. 下载 electron-vXX-win32-x64.zip 解压到 node_modules\electron\dist\
        echo   2. 在 node_modules\electron\ 下创建 path.txt，内容为 electron.exe
        pause
        exit /b 1
    )
) else (
    echo [4/5] Electron 二进制已就绪。
)

REM ============ 第 5 步：创建桌面快捷方式 ============
echo [5/5] 创建桌面快捷方式...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcut.ps1"
if errorlevel 1 (
    echo [ERROR] 快捷方式创建失败，可手动创建：
    echo   Target:   %~dp0node_modules\electron\dist\electron.exe
    echo   Args:     "%~dp0"
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   安装完成！双击桌面 "DeepSeek Harness" 即可使用
echo   首次使用请在设置中填入 DeepSeek API Key
echo ============================================================
echo.
pause
