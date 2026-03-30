const fs = require('fs');
const path = require('path');

const baseDir = __dirname;

// All directories needed
const dirs = [
  'src/app/api/analyze',
  'src/app/api/report/[id]',
  'src/app/api/health',
  'src/app/analyze',
  'src/app/report/[id]',
  'src/components/ui',
  'src/components/providers',
  'src/components/landing',
  'src/components/analyze',
  'src/components/report',
  'src/components/shared',
  'src/lib/github',
  'src/lib/ai',
  'src/lib/analysis',
  'src/lib/db',
  'src/lib/utils',
  'src/types',
  'public/assets',
  'scripts',
  'data'
];

console.log('🚀 ByteReaper Setup\n');
console.log('Creating directory structure...\n');

dirs.forEach(dir => {
  const fullPath = path.join(baseDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log('  ✓', dir);
  } else {
    console.log('  ○', dir, '(exists)');
  }
});

// Create .env.local if it doesn't exist
const envLocalPath = path.join(baseDir, '.env.local');
const envExamplePath = path.join(baseDir, '.env.example');

if (!fs.existsSync(envLocalPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envLocalPath);
  console.log('\n  ✓ Created .env.local from .env.example');
  console.log('    → Please edit .env.local and add your GEMINI_API_KEY');
}

console.log('\n✅ Setup complete!\n');
console.log('Next steps:');
console.log('  1. Add your GEMINI_API_KEY to .env.local');
console.log('  2. Run: npm install');
console.log('  3. Run: npm run dev');
console.log('  4. Open: http://localhost:3000\n');
