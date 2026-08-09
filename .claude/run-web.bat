@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
set "NODE_OPTIONS=--use-system-ca"
set "EXPO_NO_TELEMETRY=1"
cd /d "%~dp0.."
call npm run web
