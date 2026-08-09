@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
set "NODE_OPTIONS=--use-system-ca"
cd /d "%~dp0"
call npm run dev
