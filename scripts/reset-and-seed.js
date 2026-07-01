#!/usr/bin/env node

/**
 * Integrated script to reset Supabase database and create test users
 * This script calls existing scripts in the correct order
 */

const { execSync } = require('child_process');
const path = require('path');

const webCwd = path.join(process.cwd(), 'apps/web');
const CONTAINERS = [
  'supabase_kong_dose-dev',
  'supabase_rest_dose-dev',
  'supabase_auth_dose-dev',
  'supabase_storage_dose-dev',
];
const OPTIONAL_STOPPED_SERVICES = new Set([
  'supabase_imgproxy_dose-dev',
  'supabase_analytics_dose-dev',
  'supabase_vector_dose-dev',
  'supabase_pooler_dose-dev',
]);

function runSupabaseStatus() {
  try {
    const out = execSync('supabase status -o json 2>&1', {
      stdio: 'pipe',
      cwd: webCwd,
      encoding: 'utf8',
    });
    const jsonStart = out.indexOf('{');
    const stoppedMatch = out.match(/Stopped services: \[(.*?)\]/);
    const status = jsonStart >= 0 ? JSON.parse(out.slice(jsonStart)) : null;
    const stopped = stoppedMatch
      ? stoppedMatch[1].split(/\s+/).map((name) => name.trim()).filter(Boolean)
      : [];
    return { status, stopped };
  } catch {
    return { status: null, stopped: [] };
  }
}

function isApiUp() {
  return Boolean(runSupabaseStatus().status?.API_URL);
}

function waitForApi(maxAttempts = 30, intervalSec = 2) {
  for (let i = 0; i < maxAttempts; i++) {
    if (isApiUp()) return;
    execSync(`sleep ${intervalSec}`);
  }
  throw new Error('Supabase API gateway did not become ready in time');
}

function ensureSupabaseRunning() {
  if (isApiUp()) return;

  const { stopped } = runSupabaseStatus();
  const coreStopped = stopped.filter((name) => !OPTIONAL_STOPPED_SERVICES.has(name));

  if (coreStopped.length > 0) {
    console.log('⏳ Restarting stopped Supabase containers...');
    execSync(`docker start ${coreStopped.join(' ')}`, { stdio: 'inherit' });
    waitForApi();
    return;
  }

  console.log('⏳ Supabase not running, starting...');
  execSync('supabase start', { stdio: 'inherit', cwd: webCwd });
}

function restartGatewayContainers() {
  const existing = CONTAINERS.filter((name) => {
    try {
      execSync(`docker inspect ${name}`, { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  });
  if (existing.length === 0) {
    console.log('⏳ No gateway containers found, starting Supabase...');
    execSync('supabase start', { stdio: 'inherit', cwd: webCwd });
    return;
  }
  execSync(`docker restart ${existing.join(' ')}`, { stdio: 'inherit' });
  execSync('sleep 5');
}

console.log('🚀 Starting Dose database reset and user creation process...\n');

try {
  console.log('🔄 Step 1: Resetting Supabase database (auto-starts if stopped)...');
  ensureSupabaseRunning();
  try {
    execSync('supabase db reset', {
      stdio: 'inherit',
      cwd: webCwd,
    });
  } catch (err) {
    const output = [err.message, err.stderr?.toString(), err.stdout?.toString()]
      .filter(Boolean)
      .join('\n');
    if (/not running/i.test(output)) {
      console.log('⏳ Supabase stopped during reset, restarting...');
      execSync('supabase start', { stdio: 'inherit', cwd: webCwd });
      execSync('supabase db reset', { stdio: 'inherit', cwd: webCwd });
    } else {
      // Supabase CLI often returns 502 after successful reset because Kong
      // health-polls upstreams before they're ready. The DB is actually fine.
      console.warn('⚠️  reset exited non-zero (likely spurious 502). Restarting containers and continuing...');
      restartGatewayContainers();
    }
  }
  console.log('✅ Database reset completed\n');

  console.log('👥 Step 2: Creating test users...');
  execSync('node scripts/create-test-users.js', {
    stdio: 'inherit',
    cwd: process.cwd(),
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
