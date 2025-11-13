// Utility to verify profile data is actually saved in the database
import { supabase } from '@/lib/supabaseClient';

export interface ProfileVerificationResult {
  success: boolean;
  userExists: boolean;
  teacherExists: boolean;
  dataMatches: boolean;
  savedData: any;
  errors: string[];
}

/**
 * Verify that a teacher profile was actually saved to the database
 */
export async function verifyProfileSave(
  userId: string,
  expectedData: {
    full_name?: string;
    email?: string;
    phone?: string;
    location?: string;
  }
): Promise<ProfileVerificationResult> {
  const result: ProfileVerificationResult = {
    success: false,
    userExists: false,
    teacherExists: false,
    dataMatches: false,
    savedData: null,
    errors: []
  };

  try {
    console.log('=== PROFILE VERIFICATION START ===');
    console.log('Verifying profile save for user:', userId);
    console.log('Expected data:', expectedData);

    // 1. Check if user exists in users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      result.errors.push(`User check error: ${userError.message}`);
      console.error('User check error:', userError);
    } else if (userRecord) {
      result.userExists = true;
      console.log('✅ User exists in users table:', userRecord);
    } else {
      result.errors.push('User not found in users table');
      console.warn('⚠️ User not found in users table');
    }

    // 2. Check if teacher record exists
    const { data: teacherRecord, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (teacherError) {
      result.errors.push(`Teacher check error: ${teacherError.message}`);
      console.error('Teacher check error:', teacherError);
    } else if (teacherRecord) {
      result.teacherExists = true;
      result.savedData = teacherRecord;
      console.log('✅ Teacher record exists:', teacherRecord);

      // 3. Verify data matches
      let matches = true;
      if (expectedData.full_name && teacherRecord.full_name !== expectedData.full_name) {
        matches = false;
        result.errors.push(`Full name mismatch: expected "${expectedData.full_name}", got "${teacherRecord.full_name}"`);
      }
      if (expectedData.email && teacherRecord.email !== expectedData.email) {
        matches = false;
        result.errors.push(`Email mismatch: expected "${expectedData.email}", got "${teacherRecord.email}"`);
      }
      if (expectedData.phone && teacherRecord.phone !== expectedData.phone) {
        matches = false;
        result.errors.push(`Phone mismatch: expected "${expectedData.phone}", got "${teacherRecord.phone}"`);
      }
      if (expectedData.location && teacherRecord.location !== expectedData.location) {
        matches = false;
        result.errors.push(`Location mismatch: expected "${expectedData.location}", got "${teacherRecord.location}"`);
      }

      result.dataMatches = matches;
      if (matches) {
        console.log('✅ All data matches expected values');
      } else {
        console.warn('⚠️ Data mismatches found:', result.errors);
      }
    } else {
      result.errors.push('Teacher record not found in teachers table');
      console.warn('⚠️ Teacher record not found');
    }

    // 4. Overall success
    result.success = result.userExists && result.teacherExists && result.dataMatches;

    console.log('=== PROFILE VERIFICATION END ===');
    console.log('Verification result:', {
      success: result.success,
      userExists: result.userExists,
      teacherExists: result.teacherExists,
      dataMatches: result.dataMatches,
      errors: result.errors.length
    });

    return result;
  } catch (error: any) {
    result.errors.push(`Verification error: ${error.message}`);
    console.error('Verification error:', error);
    return result;
  }
}

/**
 * Quick check - just verify teacher record exists
 */
export async function quickVerifyProfile(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('teachers')
    .select('id, user_id, full_name, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Quick verify error:', error);
    return false;
  }

  return !!data;
}

// Make it available globally
if (typeof window !== 'undefined') {
  (window as any).verifyProfileSave = verifyProfileSave;
  (window as any).quickVerifyProfile = quickVerifyProfile;
  console.log('🔍 Profile verification functions available:');
  console.log('  - window.verifyProfileSave(userId, expectedData) - Full verification');
  console.log('  - window.quickVerifyProfile(userId) - Quick check');
}

