@echo off
title EDUTrack Launcher
echo Starting EDUTrack services (this takes about 10 seconds)...
wsl bash /home/charancherry/project/edutrack/start.sh
echo.
echo EDUTrack should now be running.
start http://localhost:3000
echo Close this window to stop viewing logs.
echo Services will keep running in the background.
echo To stop them later, run: wsl bash -c "pkill -f 'node.*server.js'; pkill -f 'next dev'"
echo.
pause
