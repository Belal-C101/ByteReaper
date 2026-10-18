#!/usr/bin/env node

/**
 * Pre-deployment Checklist for ByteReaper
 * 
 * Run this script before deploying to ensure everything is ready
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ByteReaper Pre-Deployment Checklist\n');

let allChecks = true;

// Check 1: Required files exist
console.log('📁 Checking required files...');
const requiredFiles = [
  'next.config.js',
  '.npmrc',
  'src/lib/firebase.ts',
  'src/lib/auth.ts',
  'src/lib/chat-history.ts',
  'firestore.rules',
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allChecks = false;
  }
});

// Check 2: Environment variables configured
console.log('\n🔑 Checking environment variables...');
const envFile = '.env.local';
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  if (envContent.includes('OPENROUTER_API_KEY')) {
    console.log('  ✅ OPENROUTER_API_KEY found');
  } else {
    console.log('  ❌ OPENROUTER_API_KEY - MISSING!');
    allChecks = false;
  }
  
  if (envContent.includes('GITHUB_TOKEN')) {
    console.log('  ✅ GITHUB_TOKEN found (optional)');
  } else {
    console.log('  ⚠️  GITHUB_TOKEN not found (optional but recommended)');
  }
} else {
  console.log('  ❌ .env.local file not found!');
  allChecks = false;
}

// Check 3: Firebase configuration
console.log('\n🔥 Checking Firebase configuration...');
const firebaseConfig = 'src/lib/firebase.ts';
if (fs.existsSync(firebaseConfig)) {
  const content = fs.readFileSync(firebaseConfig, 'utf8');
  
  if (content.includes('apiKey:') && content.includes('projectId:')) {
    console.log('  ✅ Firebase config looks good');
  } else {
    console.log('  ❌ Firebase config incomplete!');
    allChecks = false;
  }
} else {
  console.log('  ❌ Firebase config file not found!');
  allChecks = false;
}

// Check 4: package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.scripts.build) {
  console.log('  ✅ build script exists');
} else {
  console.log('  ❌ build script missing!');
  allChecks = false;
}

if (packageJson.scripts.start) {
  console.log('  ✅ start script exists');
} else {
  console.log('  ❌ start script missing!');
  allChecks = false;
}

// Check 5: Dependencies
console.log('\n📚 Checking critical dependencies...');
const criticalDeps = ['next', 'react', 'firebase', 'next-themes'];

criticalDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ❌ ${dep} - MISSING!`);
    allChecks = false;
  }
});

// Final summary
console.log('\n' + '='.repeat(50));
if (allChecks) {
  console.log('✅ All checks passed! Ready to deploy to Vercel!');
  console.log('\n📋 Next steps:');
  console.log('  1. Commit and push your code to GitHub (main deploys to production)');
  console.log('  2. Make sure the Vercel project has every variable from .env.example');
  console.log('  3. Make sure bytereaper.vercel.app is in Firebase authorized domains');
  console.log('\n🚀 Your app will be live at: https://bytereaper.vercel.app\n');
  process.exit(0);
} else {
  console.log('❌ Some checks failed! Please fix the issues above.');
  console.log('\n📖 See the Deployment section of README.md for detailed instructions.\n');
  process.exit(1);
}
