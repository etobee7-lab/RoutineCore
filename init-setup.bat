@echo off
:: Set code page to UTF-8
chcp 65001 >nul
title RoutineCore Migration Setup
setlocal enabledelayedexpansion

:: Ensure we are in the script's directory
cd /d "%~dp0"

echo.
echo ============================================
echo   RoutineCore Migration Auto Setup
echo ============================================
echo.

:: 1. Node.js Check
echo [1/3] Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

for /f "tokens=1,2,3 delims=v." %%a in ('node -v') do (
    set node_major=%%a
)
echo [OK] Node.js v!node_major! detected.

:: 2. Dependencies Install
echo.
echo [2/3] Installing dependencies (npm install)...
echo This may take a few minutes...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Please check your internet connection.
    pause
    exit /b
)
echo [OK] Dependencies installed successfully.

:: 3. Cloudflare Tunnel Setup
echo.
echo [3/3] Cloudflare Tunnel Setup
echo --------------------------------------------
echo 1. I already moved the .json auth file. (Skip)
echo 2. Login now to create a new tunnel. (Login)
echo --------------------------------------------
set /p tunnel_choice="Select (1 or 2): "

if "%tunnel_choice%"=="2" (
    echo.
    echo Opening Cloudflare login page...
    if exist "cloudflared.exe" (
        .\cloudflared.exe tunnel login
    ) else (
        echo [ERROR] cloudflared.exe not found in this directory.
    )
) else (
    echo.
    echo [INFO] Make sure to copy your .json files to %%USERPROFILE%%\.cloudflared
)

echo.
echo ============================================
echo   Setup Complete!
echo   Run 'start-manager.bat' to start the services.
echo ============================================
echo.
pause
