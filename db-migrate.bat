@echo off
chcp 65001 >nul
title RoutineCore Database Migration
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: Load .env variables
if exist .env (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        if "%%a"=="DB_USER" set DB_USER=%%b
        if "%%a"=="DB_PASSWORD" set DB_PASSWORD=%%b
        if "%%a"=="DB_NAME" set DB_NAME=%%b
    )
) else (
    set DB_USER=root
    set DB_NAME=todo_db
)

echo.
echo ============================================
echo   MySQL Database Migration Tool
echo ============================================
echo.
echo 1. DB 백업하기 (Export - 기존 PC에서 실행)
echo 2. DB 복구하기 (Import - 새로운 PC에서 실행)
echo --------------------------------------------
set /p choice="선택 (1 또는 2): "

if "%choice%"=="1" (
    echo.
    echo [Export] '%DB_NAME%' 데이터베이스를 'todo_db_backup.sql'로 백업합니다...
    mysqldump -u%DB_USER% -p%DB_PASSWORD% %DB_NAME% > todo_db_backup.sql
    if %errorlevel% neq 0 (
        echo [ERROR] 백업 실패! MySQL 경로가 PATH에 있는지 확인하세요.
    ) else (
        echo [OK] 백업 완료! 'todo_db_backup.sql' 파일을 새 PC로 옮기세요.
    )
) else if "%choice%"=="2" (
    echo.
    echo [Import] 'todo_db_backup.sql' 파일을 데이터베이스에 복구합니다...
    echo (주의: 새 PC에 MySQL이 설치되어 있고 '%DB_NAME%' 데이터베이스가 생성되어 있어야 합니다.)
    
    :: Create database if not exists
    mysql -u%DB_USER% -p%DB_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME%;"
    
    :: Restore
    mysql -u%DB_USER% -p%DB_PASSWORD% %DB_NAME% < todo_db_backup.sql
    if %errorlevel% neq 0 (
        echo [ERROR] 복구 실패! 'todo_db_backup.sql' 파일이 있는지, DB 정보가 맞는지 확인하세요.
    ) else (
        echo [OK] 데이터베이스 복구 완료!
    )
)

echo.
pause
