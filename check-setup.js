const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function checkSetup() {
  console.log('🔍 Checking system setup...\n');

  // Check if Docker is available
  try {
    await execAsync('docker --version');
    console.log('✅ Docker is available');
    
    try {
      const { stdout } = await execAsync('docker-compose ps');
      console.log('📋 Docker Compose status:');
      console.log(stdout);
    } catch (error) {
      console.log('⚠️  Docker containers not running. Run: docker-compose up -d');
    }
  } catch (error) {
    console.log('❌ Docker not available. Consider installing Docker Desktop.');
  }

  // Check if PostgreSQL is available locally
  try {
    await execAsync('psql --version');
    console.log('✅ PostgreSQL is available locally');
  } catch (error) {
    console.log('❌ PostgreSQL not available locally');
  }

  // Check if Redis is available locally
  try {
    await execAsync('redis-cli --version');
    console.log('✅ Redis is available locally');
  } catch (error) {
    console.log('❌ Redis not available locally');
  }

  // Check if Node.js backend dependencies are installed
  try {
    const fs = require('fs');
    const path = require('path');
    const backendNodeModules = path.join(__dirname, 'backend', 'node_modules');
    if (fs.existsSync(backendNodeModules)) {
      console.log('✅ Backend dependencies installed');
    } else {
      console.log('❌ Backend dependencies not installed. Run: cd backend && npm install');
    }
  } catch (error) {
    console.log('❌ Could not check backend dependencies');
  }

  console.log('\n🎯 Recommended next steps:');
  console.log('1. Install Docker Desktop if not available');
  console.log('2. Run: docker-compose up -d');
  console.log('3. Run: cd backend && npm run db:migrate');
  console.log('4. Run: npm run db:seed');
  console.log('5. Run: npm run dev');
}

checkSetup().catch(console.error);