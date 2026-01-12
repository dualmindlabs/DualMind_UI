@echo off
echo ========================================
echo Starting DualMind Arena Servers
echo ========================================
echo.

echo [1/3] Stopping any existing servers...
taskkill /f /im python.exe 2>nul
taskkill /f /im DualMind.API.exe 2>nul
echo.

echo [2/3] Starting Frontend Server (Port 8002)...
cd /d "c:\Users\Harshu\OneDrive\Desktop\DualMind_UI"
start "Frontend Server" cmd /k "python -m http.server 8002"
echo Frontend started: http://localhost:8002
echo.

echo [3/3] Starting Backend Server (Port 5079)...
cd /d "c:\Users\Harshu\source\repos\DualMind_Back"
start "Backend Server" cmd /k "dotnet run --project src/DualMind.API/DualMind.API.csproj"
echo Backend started: http://localhost:5079
echo.

echo ========================================
echo Servers are starting up...
echo.
echo Frontend: http://localhost:8002
echo Backend:  http://localhost:5079/api/arena/ping
echo.
echo Wait 10 seconds for full startup!
echo ========================================
echo.
pause
