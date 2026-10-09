@echo off
rem Installs, builds and starts SlideDrop on http://localhost:3000.
cd /d "%~dp0"
if not exist .env.local copy .env.example .env.local
call npm install || goto :fail
call npm run build || goto :fail
start "" http://localhost:3000
call npm start
goto :eof
:fail
echo Something failed above. Is Node.js 20.9+ installed?
pause
