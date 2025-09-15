@echo off
echo =============================================
echo   QuickBite Deployment Assistant
echo   Your Food Delivery System Going Live!
echo =============================================
echo.

echo [STEP 1] Preparing for deployment...
echo.

echo 📋 What you need to do manually:
echo.
echo 1. CREATE GITHUB REPOSITORY:
echo    - Go to https://github.com
echo    - Click "New repository" 
echo    - Name: quickbite-food-delivery
echo    - Make it Public
echo    - Click "Create repository"
echo.

echo 2. GET YOUR GITHUB USERNAME:
set /p github_username="Enter your GitHub username: "
echo.

echo 3. PUSH TO GITHUB:
echo Running: git remote add origin https://github.com/%github_username%/quickbite-food-delivery.git
git remote add origin https://github.com/%github_username%/quickbite-food-delivery.git
git branch -M main
git push -u origin main

echo.
echo ✅ Code pushed to GitHub successfully!
echo.

echo [STEP 2] Next steps (do these manually):
echo.
echo 🚀 DEPLOY BACKEND ON RAILWAY:
echo    1. Visit: https://railway.app
echo    2. Sign up with GitHub
echo    3. Click "Deploy from GitHub repo"
echo    4. Select: %github_username%/quickbite-food-delivery
echo    5. Add PostgreSQL service
echo    6. Add Redis service
echo    7. Set environment variables:
echo       - NODE_ENV=production
echo       - JWT_SECRET=your-secret-key
echo.

echo 🌐 DEPLOY FRONTEND ON NETLIFY:
echo    1. Visit: https://app.netlify.com
echo    2. Drag & drop: quickbite-pro.html
echo    3. Drag & drop: admin-dashboard.html (separate site)
echo    4. Note the URLs you get
echo.

echo 🔧 UPDATE FRONTEND URLs:
echo    1. Edit quickbite-pro.html 
echo    2. Edit admin-dashboard.html
echo    3. Change API_BASE to your Railway URL
echo    4. Re-upload to Netlify
echo.

echo =============================================
echo 🎉 YOUR SYSTEM WILL BE LIVE IN 15 MINUTES!
echo =============================================
echo.

echo 📱 You'll get these live URLs:
echo    • Customer App: https://[your-site].netlify.app
echo    • Admin Panel: https://[your-admin].netlify.app  
echo    • Backend API: https://[your-app].up.railway.app
echo.

echo 💡 Need help? Check DEPLOY-NOW.md for detailed steps!
echo.
pause