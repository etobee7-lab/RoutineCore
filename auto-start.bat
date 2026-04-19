@echo off
chcp 65001 > nul
title TO DO LIST - Auto Start

cd /d "%~dp0"

echo.
echo ============================================
echo   TO DO LIST Auto Start...
echo ============================================
echo.

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

echo   Stopping existing servers...
taskkill /F /IM node.exe >nul 2>&1

timeout /t 2 /nobreak >nul

echo   Starting servers...
echo.

start "TODO-Backend" cmd /k "node server.cjs"
start "TODO-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   Servers started!
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:5173
echo ============================================
echo.

timeout /t 5 /nobreak >nul
