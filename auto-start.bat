@echo off
chcp 65001 > nul
title TO DO LIST - Auto Start

:: 현재 배치 파일이 있는 디렉토리로 이동
cd /d "%~dp0"

echo.
echo ============================================
echo   TO DO LIST 자동 시작...
echo ============================================
echo.

:: node_modules 존재 여부 확인
if not exist "node_modules\" (
    echo   node_modules가 없습니다.
    echo   npm install 실행 중...
    echo.
    call npm install
    echo.
    echo   설치 완료!
    echo.
) else (
    echo   node_modules가 존재합니다. 설치 건너뜀.
    echo.
)

:: 기존 서버 중지
echo   기존 서버 중지 중...
taskkill /F /IM node.exe >nul 2>&1

:: 2초 대기
timeout /t 2 /nobreak >nul

echo   서버 시작 중...
echo.

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
