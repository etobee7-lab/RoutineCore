@echo off
chcp 65001 > nul
title TO DO LIST - Server Stopper

:: 현재 배치 파일이 있는 디렉토리로 이동
cd /d "%~dp0"

echo.
echo ============================================
echo   TO DO LIST 서버 중지...
echo ============================================
echo.

:: Node.js 프로세스 중지
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo   서버가 중지되었습니다.
) else (
    echo   실행 중인 서버가 없습니다.
)

echo.
echo ============================================
echo   완료!
echo ============================================
echo.

:: 3초 후 이 창은 자동으로 닫힘
timeout /t 3 /nobreak >nul
