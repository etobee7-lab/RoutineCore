@echo off
chcp 65001 > nul
title TO DO LIST - Server Manager

cd /d "%~dp0"

:MENU
cls
echo.
echo ============================================
echo   TO DO LIST Server Manager
echo ============================================
echo.
echo   1. Start Servers (with auto install check)
echo   2. Stop Servers
echo   3. Restart Servers
echo   4. Start Cloudflare Tunnel
echo   5. Exit
echo.
echo ============================================
set /p choice=Select option (1-5): 

if "%choice%"=="1" goto START
if "%choice%"=="2" goto STOP
if "%choice%"=="3" goto RESTART
if "%choice%"=="4" goto CLOUDFLARE
if "%choice%"=="5" goto END
goto MENU

:START
echo.
echo ============================================
echo   Starting Servers...
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
pause
goto MENU

:STOP
echo.
echo ============================================
echo   Stopping Servers...
echo ============================================
echo.

taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo   Servers stopped.
) else (
    echo   No servers running.
)

echo.
echo ============================================
echo   Complete!
echo ============================================
echo.
pause
goto MENU

:RESTART
echo.
echo ============================================
echo   Restarting Servers...
echo ============================================
echo.

taskkill /F /IM node.exe >nul 2>&1

echo   Existing servers stopped.
echo   Starting new servers...
echo.

timeout /t 2 /nobreak >nul

start "TODO-Backend" cmd /k "node server.cjs"
start "TODO-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   Servers restarted!
echo   Backend: http://localhost:3000
echo   Frontend: http://localhost:5173
echo ============================================
echo.
pause
goto MENU

:CLOUDFLARE
echo.
echo ============================================
echo   Starting Cloudflare Tunnel...
echo ============================================
echo.

echo   Tunnel URL will be generated...
echo   Use this URL to access from mobile/remote.
echo.

start "Cloudflare Tunnel" cloudflared.exe tunnel --url http://localhost:5173

echo.
echo ============================================
echo   Cloudflare Tunnel started!
echo   Check the Cloudflare window for the URL
echo ============================================
echo.
pause
goto MENU

:END
exit
