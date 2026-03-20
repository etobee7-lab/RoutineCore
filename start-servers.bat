@echo off
chcp 65001 > nul
title TO DO LIST - Server Launcher

:: 현재 배치 파일이 있는 디렉토리로 이동
cd /d "%~dp0"

:: 백엔드 서버 시작 (새 창에서)
start "TODO-Backend" cmd /k "node server.cjs"

:: 프론트엔드 개발 서버 시작 (새 창에서)
start "TODO-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   TO DO LIST 서버가 시작되었습니다!
echo   백엔드: http://localhost:3000
echo   프론트엔드: http://localhost:5173
echo ============================================
echo.

:: 5초 후 이 창은 자동으로 닫힘
timeout /t 5 /nobreak >nul
