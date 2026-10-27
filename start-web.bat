@echo off
title TRIPXU + XUTV Launcher
echo ============================================
echo   TRIPXU + XUTV Service Launcher
echo   trip.xujinkuan.de5.net / tv.xujinkuan.de5.net
echo ============================================
echo.

REM [1/4] trip backend (FastAPI :8000, serves frontend dist)
netstat -ano | findstr /r ":8000 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto skip1
echo [1/4] starting trip backend :8000 ...
start "TRIPXU-backend" cmd /k "F:\TripStar\backend\.venv\Scripts\python.exe -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --app-dir F:\TripStar\backend"
:skip1

REM [2/4] trip tunnel (cloudflared tripxu)
echo [2/4] starting trip tunnel ...
start "TRIPXU-tunnel" cmd /k "cloudflared tunnel --config C:\Users\Jack\.cloudflared\config-tripxu.yml run tripxu"

REM [3/4] LibreTV (Next.js :8080)
netstat -ano | findstr /r ":8080 .*LISTENING" >nul 2>&1
if not errorlevel 1 goto skip3
echo [3/4] starting LibreTV :8080 ...
start "XUTV-LibreTV" cmd /k "cd /d F:\LibreTV & npm run start"
:skip3

REM [4/4] tv tunnel (cloudflared libretv)
echo [4/4] starting tv tunnel ...
start "XUTV-tunnel" cmd /k "cloudflared tunnel --config C:\Users\Jack\.cloudflared\config.yml run libretv"

echo.
echo ============================================
echo  4 windows launched. Wait ~20 seconds:
echo    https://trip.xujinkuan.de5.net
echo    https://tv.xujinkuan.de5.net
echo  Close a window to stop that service.
echo ============================================
pause
