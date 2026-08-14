@echo off
REM Thin launcher: all logic lives in install.ps1 (no batch pitfalls).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
