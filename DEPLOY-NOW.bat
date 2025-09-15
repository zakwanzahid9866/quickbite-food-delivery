@echo off
echo ==========================================
echo    QuickBite - ONE-CLICK DEPLOYMENT
echo          Live in 5 minutes!
echo ==========================================
echo.

echo [Step 1/5] Preparing Git Repository...
git add .
git commit -m "QuickBite Professional Food Delivery System - Ready for Production"

echo.
echo [Step 2/5] Opening Railway for Backend Deployment...
echo 1. Visit: https://railway.app
echo 2. Sign up with GitHub
echo 3. Click "Deploy from GitHub repo"
echo 4. Select this repository
echo 5. Add PostgreSQL service
echo 6. Add Redis service
start "" "https://railway.app"

echo.
echo [Step 3/5] Opening Netlify for Frontend Deployment...
echo 1. Visit: https://netlify.com
echo 2. Drag & drop these files:
echo    - quickbite-pro.html (Customer App)
echo    - admin-dashboard.html (Admin Panel)
start "" "https://app.netlify.com/drop"

echo.
echo [Step 4/5] Your Live URLs will be:
echo ✅ Backend API: https://your-app.up.railway.app
echo ✅ Customer App: https://your-customer-app.netlify.app  
echo ✅ Admin Dashboard: https://your-admin-app.netlify.app
echo ✅ Kitchen Display: https://your-kitchen.netlify.app

echo.
echo [Step 5/5] Environment Variables for Railway:
echo Copy these to Railway environment settings:
echo.
echo NODE_ENV=production
echo JWT_SECRET=quickbite-super-secure-jwt-secret-key-production
echo CORS_ORIGINS=https://your-customer-app.netlify.app,https://your-admin-app.netlify.app

echo.
echo ==========================================
echo 🎉 DEPLOYMENT READY! 
echo Your professional food delivery system 
echo will be live in a few minutes!
echo ==========================================
pause