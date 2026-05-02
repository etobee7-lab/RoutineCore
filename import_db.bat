@echo off
chcp 65001 >nul
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --default-character-set=utf8mb4 -uroot -p"2tobee!@" todo_db < todo_db_backup.sql
echo Import Complete.
