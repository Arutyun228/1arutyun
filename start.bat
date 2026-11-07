@echo off
cd /d "%~dp0"
echo Starting 1arutyun Official Site & Admin CMS...
start "" "http://localhost:3000"
node server.js
pause
