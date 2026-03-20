@echo off
chcp 65001 > nul
title TO DO LIST - Method 2 (Server + Remote)

:: 폴더 이동
cd /d "%~dp0"

:: 빌드 확인 안내
echo.
echo ============================================
echo   [안내] Method 2 (서버 단독 실행) 모드입니다.
echo   최신 화면을 반영하려면 'npm run build'를 
echo   먼저 실행했었어야 합니다.
echo ============================================
echo.

:: 백엔드 서버 시작 (새 창에서)
:: server.cjs가 dist 폴더의 정적 파일을 서비스합니다.
start "TODO-Backend-Server" cmd /k "node server.cjs"

:: 서버가 켜질 시간을 잠시 기다림 (2초)
timeout /t 2 /nobreak >nul

:: Cloudflare Tunnel 시작 (새 창에서)
if exist "cloudflared.exe" (
    echo [정보] 원격 접속 터널을 시작합니다...
    :: localhost 대신 127.0.0.1을 사용하여 IPv4 연결 강제
    start "TODO-Remote-Tunnel" cmd /k ".\cloudflared.exe tunnel --url http://127.0.0.1:3000"
) else (
    echo [오류] cloudflared.exe를 찾을 수 없습니다.
)

echo.
echo 서버와 터널이 각각의 창에서 실행되었습니다.
echo 터널 창에서 https://....trycloudflare.com 주소를 확인하세요.
echo.

:: 5초 후 창 닫기
timeout /t 5 /nobreak >nul
