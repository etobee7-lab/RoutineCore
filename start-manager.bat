@echo off
title RoutineCore Cloud Control Manager
cd /d "%~dp0"

echo.
echo ============================================
echo   RoutineCore Cloud Control Starting...
echo ============================================
echo.

:: Check for node_modules
if not exist "node_modules\" (
    echo [ERROR] node_modules not found. Please run 'npm install' first.
    pause
    exit
)

:: Start the manager
echo Starting management server on http://localhost:4000
echo.
node CloudManager\manager.cjs

pause
