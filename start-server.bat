@echo off
echo ================================================
echo   MugShots Cafe POS - Local Network Server
echo ================================================
echo.
echo Installing http-server (one-time only)...
call npm install -g http-server
echo.
echo Starting server...
echo.

REM Get IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    goto :found
)

:found
REM Remove leading spaces
set IP=%IP: =%

echo.
echo ================================================
echo   Server is RUNNING!
echo ================================================
echo.
echo 1. Open this link to get QR CODE:
echo    https://api.qrserver.com/v1/create-qr-code/?size=300x300^&data=http://%IP%:8080
echo.
echo 2. Scan the QR code with your tablet
echo.
echo 3. Or type this in tablet browser:
echo    http://%IP%:8080
echo.
echo ================================================
echo   Press CTRL+C to stop the server
echo ================================================
echo.

REM Start Node.js HTTP server
http-server -p 8080 -c-1
