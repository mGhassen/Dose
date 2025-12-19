#!/usr/bin/env node

/**
 * Check and fix Square integration environment variables
 */

const fs = require('fs');
const path = require('path');

const envFiles = [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '../apps/web/.env'),
  path.join(__dirname, '../apps/web/.env.local'),
];

const correctRedirectUri = 'http://localhost:3000/api/integrations/oauth/square/callback';
const wrongPatterns = [
  'squareup.com/oauth2/authorize',
  'squareupsandbox.com/oauth2/authorize',
];

let foundIssues = false;

envFiles.forEach(envFile => {
  if (!fs.existsSync(envFile)) {
    return;
  }

  console.log(`\nChecking ${envFile}...`);
  let content = fs.readFileSync(envFile, 'utf8');
  let modified = false;
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    if (line.startsWith('SQUARE_REDIRECT_URI=')) {
      const currentValue = line.split('=')[1]?.trim();
      
      // Check if it's wrong
      const isWrong = wrongPatterns.some(pattern => currentValue?.includes(pattern));
      
      if (isWrong) {
        console.error(`❌ FOUND ISSUE in ${envFile}:`);
        console.error(`   Current (WRONG): ${currentValue}`);
        console.error(`   Should be: ${correctRedirectUri}`);
        
        // Fix it
        lines[index] = `SQUARE_REDIRECT_URI=${correctRedirectUri}`;
        modified = true;
        foundIssues = true;
        console.log(`✅ Fixed line ${index + 1}`);
      } else if (currentValue && !currentValue.includes('/api/integrations/oauth/square/callback')) {
        console.warn(`⚠️  WARNING in ${envFile}:`);
        console.warn(`   Current: ${currentValue}`);
        console.warn(`   Should contain: /api/integrations/oauth/square/callback`);
      } else if (currentValue === correctRedirectUri) {
        console.log(`✅ SQUARE_REDIRECT_URI is correct: ${currentValue}`);
      }
    }
  });

  if (modified) {
    fs.writeFileSync(envFile, lines.join('\n'), 'utf8');
    console.log(`\n✅ Fixed ${envFile}`);
  }
});

if (foundIssues) {
  console.log('\n✅ All issues fixed! Please restart your development server.');
  process.exit(0);
} else {
  console.log('\n✅ No issues found in environment files.');
  process.exit(0);
}

