@echo off
chcp 65001 > nul
title TO DO LIST - Cloudflare Tunnel

cd /d "%~dp0"

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

timeout /t 3 /nobreak >nul
