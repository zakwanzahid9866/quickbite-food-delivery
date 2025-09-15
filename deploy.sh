#!/bin/bash

# QuickBite System - One-Click Deployment Script
echo "🚀 Deploying QuickBite Food Delivery System"
echo "============================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📝 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: QuickBite Professional Food Delivery System"
fi

# Environment selection
echo "📋 Select deployment option:"
echo "1. Railway (Recommended - Free tier)"
echo "2. Netlify + Heroku (Classic)"
echo "3. Vercel + PlanetScale (Modern)"
echo "4. DigitalOcean App Platform (Professional)"
echo "5. Manual setup instructions"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🚀 Setting up Railway deployment..."
        echo "Steps:"
        echo "1. Push code to GitHub"
        echo "2. Visit https://railway.app"
        echo "3. Connect your GitHub repository"
        echo "4. Add PostgreSQL service"
        echo "5. Add Redis service"
        echo "6. Deploy automatically!"
        
        echo "📝 Creating railway.json config..."
        cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
EOF
        ;;
    
    2)
        echo "🌐 Setting up Netlify + Heroku..."
        echo "Frontend → Netlify, Backend → Heroku"
        
        # Create Procfile for Heroku
        echo "web: npm start" > Procfile
        
        echo "Steps:"
        echo "1. Deploy backend to Heroku"
        echo "2. Deploy frontend to Netlify"
        echo "3. Update CORS settings"
        ;;
    
    3)
        echo "⚡ Setting up Vercel + PlanetScale..."
        echo "Modern serverless deployment"
        
        # Create vercel.json
        cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "backend/src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/src/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "/\$1"
    }
  ]
}
EOF
        ;;
    
    4)
        echo "🌊 Setting up DigitalOcean App Platform..."
        
        # Create .do/app.yaml
        mkdir -p .do
        cat > .do/app.yaml << EOF
name: quickbite-system
services:
- name: backend
  source_dir: backend
  github:
    repo: your-username/quickbite-system
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
databases:
- engine: PG
  name: quickbite-db
  num_nodes: 1
  size: db-s-dev-database
- engine: REDIS
  name: quickbite-cache
  num_nodes: 1
  size: db-s-dev-database
EOF
        ;;
    
    5)
        echo "📖 Manual deployment instructions:"
        echo "See DEPLOYMENT-GUIDE.md for detailed instructions"
        ;;
esac

echo ""
echo "✅ Deployment configuration complete!"
echo "📋 Next steps:"
echo "1. Update environment variables for production"
echo "2. Set up custom domain (optional)"
echo "3. Configure SSL certificate"
echo "4. Set up monitoring and logging"
echo ""
echo "🎉 Your QuickBite system will be live soon!"