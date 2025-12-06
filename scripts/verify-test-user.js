#!/usr/bin/env node

/**
 * Development helper script to verify a test user's email
 * Usage: node scripts/verify-test-user.js <email>
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const email = process.argv[2];

if (!email) {
    console.error('❌ Usage: node scripts/verify-test-user.js <email>');
    process.exit(1);
}

async function verifyUser(email) {
    console.log(`🔍 Looking for user with email: ${email}`);

    // Get the user
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
        console.error('❌ Error listing users:', listError);
        return;
    }

    const user = users.users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ User not found with email: ${email}`);
        return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Update the user to verify email
    const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (error) {
        console.error('❌ Error verifying user:', error);
        return;
    }

    console.log('✅ User email verified successfully!');
    console.log('   User ID:', user.id);
    console.log('   Email:', email);
    console.log('   Email Confirmed:', data.user.email_confirmed_at ? 'Yes' : 'No');
}

verifyUser(email);
