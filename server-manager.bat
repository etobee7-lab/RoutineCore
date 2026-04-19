@echo off
chcp 65001 > nul
title TO DO LIST - Auto Start All

cd /d "%~dp0"

echo.
echo ============================================
echo   TO DO LIST Auto Start (All Services)
echo ============================================
echo.

:: Auto install check
if not exist "node_modules\" (
    echo   node_modules not found.
    echo   Running npm install...
    echo.
    call npm install
    echo.
    echo   Install complete!
    echo.
) else (
    echo   node_modules exists. Skipping install.
    echo.
)

:: Stop existing servers
echo   Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1

timeout /t 2 /nobreak >nul

:: Start backend
echo   Starting Backend server...
start "TODO-Backend" cmd /k "node server.cjs"

timeout /t 2 /nobreak >nul

:: Start frontend
echo   Starting Frontend server...
start "TODO-Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

:: Start Cloudflare tunnel
echo   Starting Cloudflare Tunnel...
start "Cloudflare Tunnel" cloudflared.exe tunnel --url http://localhost:5173

timeout /t 2 /nobreak >nul

echo.
echo ============================================
echo   All services started!
echo   Local: http://localhost:5173
echo   Backend: http://localhost:3000
echo   Remote: Check Cloudflare window for URL
echo ============================================
echo.

:: Keep window open
pause
