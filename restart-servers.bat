@echo off
chcp 65001 > nul
title TO DO LIST - Server Restart

:: 현재 배치 파일이 있는 디렉토리로 이동
cd /d "%~dp0"

echo.
echo ============================================
echo   TO DO LIST 서버 재시작...
echo ============================================
echo.

:: Node.js 프로세스 중지
taskkill /F /IM node.exe >nul 2>&1

echo   기존 서버 중지 완료.
echo   새로운 서버 시작 중...
echo.

:: 2초 대기
timeout /t 2 /nobreak >nul

:: 백엔드 서버 시작 (새 창에서)
start "TODO-Backend" cmd /k "node server.cjs"

:: 프론트엔드 개발 서버 시작 (새 창에서)
start "TODO-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   TO DO LIST 서버가 재시작되었습니다!
echo   백엔드: http://localhost:3000
echo   프론트엔드: http://localhost:5173
echo ============================================
echo.

:: 5초 후 이 창은 자동으로 닫힘
timeout /t 5 /nobreak >nul
