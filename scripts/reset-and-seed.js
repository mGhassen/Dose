#!/usr/bin/env node

/**
 * Integrated script to reset Supabase database and create test users
 * This script calls existing scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting SunnyBudget database reset and user creation process...\n');

try {
  // Step 1: Reset Supabase database
  console.log('🔄 Step 1: Resetting Supabase database...');
  execSync('supabase db reset', { 
    stdio: 'inherit',
    cwd: path.join(process.cwd(), 'apps/web')
  });
  console.log('✅ Database reset completed\n');

  // Step 2: Create test users
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
  console.log('Admin: admin@sunnybudget.com / password123');
  console.log('Manager: manager@sunnybudget.com / password123');
  console.log('User: user@sunnybudget.com / password123');
  console.log('Analyst: analyst@sunnybudget.com / password123');
  console.log('Pending: pending@sunnybudget.com / password123');

} catch (error) {
  console.error('❌ Error during reset and seed process:', error.message);
  process.exit(1);
}
