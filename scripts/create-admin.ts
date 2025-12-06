#!/usr/bin/env tsx

/**
 * Create Admin User Script
 * 
 * Promotes an existing user to admin role
 * Usage: npm run create-admin
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials');
    console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}

async function createAdmin() {
    console.log('\n🔐 Admin User Setup\n');
    console.log('This script will promote an existing user to admin role.\n');

    // Get email from user
    const email = await question('Enter user email: ');

    if (!email || !email.includes('@')) {
        console.error('❌ Invalid email address');
        rl.close();
        process.exit(1);
    }

    console.log(`\n🔍 Looking for user: ${email}...`);

    try {
        // Check if user exists
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('id, email, role, full_name')
            .eq('email', email)
            .maybeSingle();

        if (fetchError) {
            console.error('❌ Database error:', fetchError.message);
            rl.close();
            process.exit(1);
        }

        if (!user) {
            console.error(`❌ User not found with email: ${email}`);
            console.log('\n💡 Tip: User must register first before being promoted to admin');
            rl.close();
            process.exit(1);
        }

        // Check if already admin
        if (user.role === 'admin') {
            console.log(`✅ User ${email} is already an admin!`);
            console.log(`   Name: ${user.full_name || 'N/A'}`);
            rl.close();
            process.exit(0);
        }

        // Confirm promotion
        console.log(`\n📋 User Details:`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.full_name || 'N/A'}`);
        console.log(`   Current Role: ${user.role}`);
        console.log(`   New Role: admin\n`);

        const confirm = await question('Promote this user to admin? (yes/no): ');

        if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
            console.log('❌ Cancelled');
            rl.close();
            process.exit(0);
        }

        // Update user role to admin
        console.log('\n⏳ Promoting user to admin...');

        const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (updateError) {
            console.error('❌ Failed to update user:', updateError.message);
            rl.close();
            process.exit(1);
        }

        // Verify update
        const { data: updatedUser } = await supabase
            .from('users')
            .select('email, role')
            .eq('id', user.id)
            .single();

        if (updatedUser?.role === 'admin') {
            console.log('\n✅ Success! User promoted to admin.\n');
            console.log('📝 Next steps:');
            console.log('   1. User should log out and log back in');
            console.log('   2. Navigate to: http://localhost:5000/admin/login');
            console.log('   3. Login with their credentials');
            console.log('   4. Access admin panel at: /admin/dashboard\n');
        } else {
            console.error('❌ Update verification failed');
        }

    } catch (error: any) {
        console.error('❌ Unexpected error:', error.message);
        rl.close();
        process.exit(1);
    }

    rl.close();
}

// Run the script
createAdmin().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
