@echo off
echo ====================================
echo    Fast Food System - Demo Startup
echo ====================================
echo.

echo [1/4] Starting Database Services...
docker-compose up -d
timeout 10

echo [2/4] Verifying System Health...
curl -s http://localhost:3000/health > nul
if %errorlevel% neq 0 (
    echo Starting Backend Server...
    start /min cmd /c "cd backend && node src/server-simple.js"
    timeout 5
)

echo [3/4] Opening Kitchen Display...
start /min cmd /c "cd kitchen-display && npm install && npm run dev"
timeout 3

echo [4/4] Starting Print Agent...
start /min cmd /c "cd print-agent && node index.js"

echo.
echo ====================================
echo    System Ready for Demonstration!
echo ====================================
echo.
echo Available URLs:
echo - Backend API: http://localhost:3000
echo - Kitchen Display: http://localhost:5173
echo - Health Check: http://localhost:3000/health
echo.
echo Demo accounts:
echo - Customer: +1234567892 / customer123
echo - Kitchen Staff: +1234567891 / staff123
echo - Admin: +1234567890 / admin123
echo - Driver: +1234567893 / driver123
echo.
pause