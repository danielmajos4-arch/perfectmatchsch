#!/usr/bin/env node
/**
 * Setup Verification Script
 * Verifies environment variables, code structure, and prepares for testing
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  log('\n📋 Checking Environment Variables...', 'cyan');
  const envPath = join(__dirname, '.env');
  
  if (!existsSync(envPath)) {
    log('❌ .env file not found', 'red');
    return false;
  }
  
  const envContent = readFileSync(envPath, 'utf-8');
  const hasUrl = envContent.includes('VITE_SUPABASE_URL=');
  const hasKey = envContent.includes('VITE_SUPABASE_ANON_KEY=');
  
  if (hasUrl && hasKey) {
    const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
    const url = urlMatch ? urlMatch[1].trim() : '';
    
    if (url && !url.includes('your_supabase')) {
      log('✅ .env file exists with Supabase credentials', 'green');
      log(`   URL: ${url.substring(0, 40)}...`, 'blue');
      return true;
    }
  }
  
  log('⚠️  .env file exists but may have placeholder values', 'yellow');
  return false;
}

function checkSchemaFile() {
  log('\n📋 Checking Database Schema...', 'cyan');
  const schemaPath = join(__dirname, 'supabase-schema-fixed.sql');
  
  if (!existsSync(schemaPath)) {
    log('❌ supabase-schema-fixed.sql not found', 'red');
    return false;
  }
  
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const requiredTables = ['users', 'teachers', 'schools', 'jobs', 'applications'];
  const missingTables = [];
  
  for (const table of requiredTables) {
    if (!schemaContent.includes(`CREATE TABLE`) || !schemaContent.includes(table)) {
      missingTables.push(table);
    }
  }
  
  if (missingTables.length === 0) {
    log('✅ Schema file contains all required tables', 'green');
    log(`   Tables: ${requiredTables.join(', ')}`, 'blue');
    return true;
  }
  
  log(`❌ Schema file missing tables: ${missingTables.join(', ')}`, 'red');
  return false;
}

function checkSupabaseClient() {
  log('\n📋 Checking Supabase Client Code...', 'cyan');
  const clientPath = join(__dirname, 'client', 'src', 'lib', 'supabaseClient.ts');
  
  if (!existsSync(clientPath)) {
    log('❌ supabaseClient.ts not found', 'red');
    return false;
  }
  
  const clientContent = readFileSync(clientPath, 'utf-8');
  const hasEnvCheck = clientContent.includes('VITE_SUPABASE_URL') && 
                      clientContent.includes('VITE_SUPABASE_ANON_KEY');
  const hasErrorHandling = clientContent.includes('Missing Supabase environment variables');
  const hasClientExport = clientContent.includes('export const supabase');
  
  if (hasEnvCheck && hasErrorHandling && hasClientExport) {
    log('✅ Supabase client configured correctly', 'green');
    log('   - Environment variable checks ✓', 'blue');
    log('   - Error handling ✓', 'blue');
    log('   - Client export ✓', 'blue');
    return true;
  }
  
  log('⚠️  Supabase client may need updates', 'yellow');
  return false;
}

function checkAuthPages() {
  log('\n📋 Checking Authentication Pages...', 'cyan');
  const loginPath = join(__dirname, 'client', 'src', 'pages', 'Login.tsx');
  const registerPath = join(__dirname, 'client', 'src', 'pages', 'Register.tsx');
  
  const checks = {
    login: existsSync(loginPath),
    register: existsSync(registerPath),
  };
  
  if (checks.login && checks.register) {
    const loginContent = readFileSync(loginPath, 'utf-8');
    const registerContent = readFileSync(registerPath, 'utf-8');
    
    const loginHasAuth = loginContent.includes('signInWithPassword');
    const registerHasAuth = registerContent.includes('signUp');
    const bothHaveErrorHandling = loginContent.includes('error') && registerContent.includes('error');
    
    if (loginHasAuth && registerHasAuth && bothHaveErrorHandling) {
      log('✅ Authentication pages configured correctly', 'green');
      log('   - Login page ✓', 'blue');
      log('   - Register page ✓', 'blue');
      log('   - Error handling ✓', 'blue');
      return true;
    }
  }
  
  log('⚠️  Authentication pages may need updates', 'yellow');
  return false;
}

function checkJobPages() {
  log('\n📋 Checking Job Pages...', 'cyan');
  const jobsPath = join(__dirname, 'client', 'src', 'pages', 'Jobs.tsx');
  const jobDetailPath = join(__dirname, 'client', 'src', 'pages', 'JobDetail.tsx');
  const schoolDashboardPath = join(__dirname, 'client', 'src', 'pages', 'SchoolDashboard.tsx');
  
  const allExist = existsSync(jobsPath) && existsSync(jobDetailPath) && existsSync(schoolDashboardPath);
  
  if (allExist) {
    log('✅ Job pages exist', 'green');
    log('   - Jobs listing ✓', 'blue');
    log('   - Job detail ✓', 'blue');
    log('   - School dashboard ✓', 'blue');
    return true;
  }
  
  log('⚠️  Some job pages may be missing', 'yellow');
  return false;
}

function checkApplicationPages() {
  log('\n📋 Checking Application Pages...', 'cyan');
  const appModalPath = join(__dirname, 'client', 'src', 'components', 'ApplicationModal.tsx');
  const teacherDashboardPath = join(__dirname, 'client', 'src', 'pages', 'TeacherDashboard.tsx');
  
  const allExist = existsSync(appModalPath) && existsSync(teacherDashboardPath);
  
  if (allExist) {
    log('✅ Application pages exist', 'green');
    log('   - Application modal ✓', 'blue');
    log('   - Teacher dashboard ✓', 'blue');
    return true;
  }
  
  log('⚠️  Some application pages may be missing', 'yellow');
  return false;
}

function generateSummary(results) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 Verification Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  
  for (const [check, passed] of Object.entries(results)) {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${check}`, color);
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  log(`Results: ${passed}/${total} checks passed`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All code checks passed! Ready for database setup and testing.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Run supabase-schema-fixed.sql in Supabase SQL Editor', 'blue');
    log('2. Start dev server: npm run dev', 'blue');
    log('3. Follow VERIFICATION_GUIDE.md for testing', 'blue');
  } else {
    log('\n⚠️  Some checks failed. Please review and fix before proceeding.', 'yellow');
  }
}

// Run all checks
const results = {
  'Environment Variables': checkEnvFile(),
  'Database Schema': checkSchemaFile(),
  'Supabase Client': checkSupabaseClient(),
  'Authentication Pages': checkAuthPages(),
  'Job Pages': checkJobPages(),
  'Application Pages': checkApplicationPages(),
};

generateSummary(results);

process.exit(Object.values(results).every(Boolean) ? 0 : 1);

