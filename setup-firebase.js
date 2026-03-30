#!/usr/bin/env node

/**
 * Firebase Setup Script for ByteReaper
 * 
 * This script:
 * 1. Installs Firebase SDK
 * 2. Generates all Firebase auth UI components
 * 3. Sets up the authentication system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 ByteReaper Firebase Setup\n');

// Step 1: Install Firebase
console.log('📦 Installing Firebase SDK...');
try {
  execSync('npm install firebase', { stdio: 'inherit' });
  console.log('✅ Firebase installed successfully\n');
} catch (error) {
  console.error('❌ Failed to install Firebase:', error.message);
  process.exit(1);
}

// Step 2: Run the generator
console.log('🎨 Generating authentication UI components...');
try {
  execSync('node generate-firebase-auth.js', { stdio: 'inherit' });
  console.log('\n✅ All components generated successfully\n');
} catch (error) {
  console.error('❌ Failed to generate components:', error.message);
  process.exit(1);
}

console.log('🎉 Firebase setup complete!');
console.log('\n📋 Next steps:');
console.log('   1. Run: npm run dev');
console.log('   2. Navigate to: http://localhost:3000/signup');
console.log('   3. Create an account and start chatting!\n');
console.log('🔐 Authentication features:');
console.log('   • Email/Password signup and login');
console.log('   • Google OAuth sign-in');
console.log('   • Protected routes (requires login)');
console.log('   • Persistent chat history per user\n');
