@echo off
cls
echo.
echo ====================================================
echo          🍔 FAST FOOD SYSTEM DEMO 🍔
echo ====================================================
echo.
echo Welcome to my complete restaurant management system!
echo.
echo What this system includes:
echo ✅ Customer Mobile App for ordering
echo ✅ Kitchen Display for staff
echo ✅ Driver App for delivery tracking  
echo ✅ Auto-printing receipts
echo ✅ Real-time order updates
echo ✅ Admin management panel
echo.
echo ====================================================
echo                STARTING DEMO...
echo ====================================================
echo.

echo [1/3] Starting database and backend server...
start /min cmd /c "cd backend && node src/server-simple.js"
timeout 3

echo [2/3] Opening demo dashboard in browser...
explorer demo-dashboard.html
timeout 2

echo [3/3] Running live order test...
echo.
echo ====================================================
echo             🧪 TESTING ORDER FLOW
echo ====================================================
echo.

node test-order-flow.js

echo.
echo ====================================================
echo              ✅ DEMO COMPLETE!
echo ====================================================
echo.
echo The browser dashboard is now open showing:
echo • System health status
echo • Test user accounts  
echo • Quick action buttons
echo • Live activity logs
echo.
echo You can also access:
echo • Kitchen Display: http://localhost:5173
echo • API Health: http://localhost:3000/health
echo.
echo Press any key to exit...
pause > nul