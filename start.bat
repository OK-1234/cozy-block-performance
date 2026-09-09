@echo off
setlocal
cd /d "%~dp0"
echo Open http://localhost:8000/ in your browser.
echo Keep this window open. Press Ctrl+C to stop.
echo For a phone on the same Wi-Fi, use http://YOUR-PC-IP:8000/
echo.
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -m http.server 8000 --bind 0.0.0.0
  goto :end
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m http.server 8000 --bind 0.0.0.0
  goto :end
)
python -m http.server 8000 --bind 0.0.0.0
:end
pause
