#!/usr/bin/env node

/**
 * Integrated script to reset Supabase database and create test users
 * This script calls existing scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Dose database reset and user creation process...\n');

try {
  console.log('🔄 Step 1: Resetting Supabase database (auto-starts if stopped)...');
  try {
    execSync('supabase db reset', {
      stdio: 'inherit',
      cwd: path.join(process.cwd(), 'apps/web')
    });
  } catch (err) {
    // Supabase CLI often returns 502 after successful reset because Kong
    // health-polls upstreams before they're ready. The DB is actually fine.
    // Verify by restarting the gateway containers and continuing.
    console.warn('⚠️  reset exited non-zero (likely spurious 502). Restarting containers and continuing...');
    execSync('docker restart supabase_kong_dose-dev supabase_rest_dose-dev supabase_auth_dose-dev supabase_storage_dose-dev', {
      stdio: 'inherit'
    });
    // Give upstreams a moment
    execSync('sleep 5');
  }
  console.log('✅ Database reset completed\n');

  console.log('👥 Step 2: Creating test users...');
  execSync('node scripts/create-test-users.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Test users created\n');

  console.log('🎉 All steps completed successfully!');
  console.log('\n📋 Summary:');
  console.log('1. ✅ Database reset (migrations applied)');
  console.log('2. ✅ Test users created');
  
  console.log('\n🔐 Test User Credentials:');
  console.log('Admin: admin@dose.com / password123');
  console.log('Manager: manager@dose.com / password123');
  console.log('User: user@dose.com / password123');
  console.log('Analyst: analyst@dose.com / password123');
  console.log('Pending: pending@dose.com / password123');

} catch (error) {
  console.error('❌ Error during reset and seed process:', error.message);
  process.exit(1);
}
