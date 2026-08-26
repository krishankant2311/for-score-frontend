@echo off
REM Copy static assets into Next.js standalone output (required for GoDaddy / IP deploy).
REM Run from FOUR-Score-main after: npm run build

set STANDALONE=.next\standalone
if not exist "%STANDALONE%\server.js" (
  echo Run npm run build first.
  exit /b 1
)

xcopy /E /I /Y public "%STANDALONE%\public"
xcopy /E /I /Y .next\static "%STANDALONE%\.next\static"

echo Standalone folder ready: %STANDALONE%
echo Upload this folder to the server and start server.js
