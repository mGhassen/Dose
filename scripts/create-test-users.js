#!/usr/bin/env node

/**
 * Script to create test users in SunnyBudget Supabase
 * Creates auth users and account/profile records
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Try to load .env from multiple locations
const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), 'apps/web/.env'),
  path.join(process.cwd(), 'apps/web/.env.local'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`📄 Loaded environment from: ${envPath}`);
    break;
  }
}

// If no .env file found, try default dotenv behavior
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  require('dotenv').config();
}

// For local Supabase, try to get credentials from Supabase CLI
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  try {
    const { execSync } = require('child_process');
    const supabaseConfigPath = path.join(process.cwd(), 'apps/web/supabase/config.toml');
    if (fs.existsSync(supabaseConfigPath)) {
      console.log('🔍 Trying to get Supabase credentials from `supabase status`...');
      try {
        const statusOutput = execSync('cd apps/web && supabase status --output json', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const status = JSON.parse(statusOutput);
        if (status.API && status.API.url) {
          process.env.NEXT_PUBLIC_SUPABASE_URL = status.API.url;
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = status.API.anon_key || '';
          process.env.SUPABASE_SERVICE_ROLE_KEY = status.API.service_role_key || '';
          console.log('✅ Found Supabase credentials from `supabase status`');
        }
      } catch (e) {
        // If supabase status fails, try default local URLs
        console.log('⚠️  Could not get credentials from `supabase status`, using defaults');
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:64321';
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
// Service role key for creating users without signup
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL environment variable is required');
  process.exit(1);
}

if (!anonKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY environment variable is required');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required to create users without signup');
  process.exit(1);
}

console.log(`🔗 Using Supabase URL: ${supabaseUrl}`);
// Use admin client (service role) for all operations to bypass RLS
const admin = createClient(supabaseUrl, serviceRoleKey);
const supabase = admin; // Use admin client for database operations too

// SunnyBudget test users
const testUsers = [
  // Admin users
  {
    email: 'admin@sunnybudget.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'User',
    isAdmin: true,
    profileEmail: 'admin.contact@sunnybudget.com',
    status: 'active',
    phone: '+1 555 0100',
    address: '123 Admin Street, City, State 12345',
    profession: 'System Administrator'
  },
  {
    email: 'manager@sunnybudget.com',
    password: 'password123',
    firstName: 'Manager',
    lastName: 'User',
    isAdmin: true,
    profileEmail: 'manager.contact@sunnybudget.com',
    status: 'active',
    phone: '+1 555 0101',
    address: '456 Manager Avenue, City, State 12345',
    profession: 'Finance Manager'
  },
  
  // Regular users
  {
    email: 'user@sunnybudget.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: false,
    profileEmail: 'john.contact@sunnybudget.com',
    status: 'active',
    phone: '+1 555 0102',
    address: '789 User Lane, City, State 12345',
    profession: 'Financial Analyst'
  },
  {
    email: 'analyst@sunnybudget.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    isAdmin: false,
    profileEmail: 'jane.contact@sunnybudget.com',
    status: 'active',
    phone: '+1 555 0103',
    address: '321 Analyst Road, City, State 12345',
    profession: 'Budget Analyst'
  },
  
  // Pending user (for testing approval flow)
  {
    email: 'pending@sunnybudget.com',
    password: 'password123',
    firstName: 'Pending',
    lastName: 'User',
    isAdmin: false,
    profileEmail: 'pending.contact@sunnybudget.com',
    status: 'pending',
    phone: '+1 555 0104',
    address: '654 Pending Street, City, State 12345',
    profession: 'New User'
  }
];

async function createTestUsers() {
  console.log('🚀 Creating SunnyBudget test users in Supabase auth...\n');
  
  for (const user of testUsers) {
    try {
      console.log(`📝 Processing user: ${user.email}`);
      
      // Step 1: Get or create auth user
      let authUserId;
      let authUserCreated = false;
      
      // Try to get existing user by email
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === user.email);
      
      if (existingUser) {
        authUserId = existingUser.id;
        console.log(`✅ Auth user already exists: ${user.email} (ID: ${authUserId})`);
        
        // Update password if needed
        await admin.auth.admin.updateUserById(authUserId, {
          password: user.password,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName
          }
        });
      } else {
        // Create new auth user
        const { data: authUser, error: authError } = await admin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            first_name: user.firstName,
            last_name: user.lastName
          }
        });
        
        if (authError) {
          console.error(`❌ Auth error: ${authError.message}`);
          continue;
        }
        
        if (!authUser || !authUser.user) {
          console.error(`❌ No user returned for ${user.email}`);
          continue;
        }
        
        authUserId = authUser.user.id;
        authUserCreated = true;
        console.log(`✅ Auth user created: ${user.email} (ID: ${authUserId})`);
      }
      
      // Step 2: Check if account exists
      const { data: existingAccount } = await supabase
        .from('accounts')
        .select('id, profile_id')
        .eq('auth_user_id', authUserId)
        .single();
      
      let profileId;
      
      if (existingAccount && existingAccount.profile_id) {
        // Account and profile exist, update them
        profileId = existingAccount.profile_id;
        console.log(`✅ Account already exists, updating...`);
        
        await supabase
          .from('profiles')
          .update({
            first_name: user.firstName,
            last_name: user.lastName,
            phone: user.phone,
            profile_email: user.profileEmail,
            address: user.address,
            profession: user.profession
          })
          .eq('id', profileId);
        
        await supabase
          .from('accounts')
          .update({
            email: user.email,
            status: user.status,
            is_admin: user.isAdmin || false
          })
          .eq('id', existingAccount.id);
        
        console.log(`✅ User ${user.email} updated successfully!\n`);
        continue;
      }
      
      // Step 3: Create profile record
      const { data: profileRecord, error: profileError } = await supabase
        .from('profiles')
        .insert({
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone,
          profile_email: user.profileEmail,
          address: user.address,
          profession: user.profession
        })
        .select()
        .single();
      
      if (profileError) {
        console.error(`❌ Profile creation error: ${profileError.message}`);
        continue;
      }
      
      profileId = profileRecord.id;
      console.log(`✅ Profile record created: ${profileId}`);
      
      // Step 4: Create or update account record
      if (existingAccount) {
        // Update existing account
        await supabase
          .from('accounts')
          .update({
            email: user.email,
            status: user.status,
            is_admin: user.isAdmin || false,
            profile_id: profileId
          })
          .eq('id', existingAccount.id);
        console.log(`✅ Account record updated: ${existingAccount.id}`);
      } else {
        // Create new account
        const { data: accountRecord, error: accountError } = await supabase
          .from('accounts')
          .insert({
            id: authUserId, // Use auth user ID as account ID
            auth_user_id: authUserId,
            email: user.email,
            status: user.status,
            is_admin: user.isAdmin || false,
            profile_id: profileId
          })
          .select()
          .single();
        
        if (accountError) {
          console.error(`❌ Account creation error: ${accountError.message}`);
          continue;
        }
        
        console.log(`✅ Account record created: ${accountRecord.id}`);
      }
      
      console.log(`✅ User ${user.email} completed successfully!\n`);
      
    } catch (error) {
      console.error(`❌ Error processing ${user.email}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 All SunnyBudget test users creation completed!');
  console.log('\n🔐 Login Credentials:');
  testUsers.forEach(user => {
    console.log(`${user.email} / ${user.password}`);
  });
  
  console.log('\n💡 What was created:');
  console.log('1. Auth users in Supabase auth');
  console.log('2. Account records in accounts table (with is_admin flag)');
  console.log('3. Profile records in profiles table');
  console.log('\n👥 User Types:');
  console.log('- Admin users: Have isAdmin = true → accounts.is_admin = true');
  console.log('- Regular users: Have isAdmin = false → accounts.is_admin = false');
  console.log('\n📊 User Statuses:');
  console.log('- active: Can use the system');
  console.log('- pending: Awaiting approval');
  console.log('- suspended: Temporarily disabled');
  console.log('- archived: Inactive users');
}

createTestUsers().catch(console.error);
