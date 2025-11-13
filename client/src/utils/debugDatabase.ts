// Database state debugging utility
import { supabase } from '@/lib/supabaseClient';

export interface DatabaseStateCheck {
  authUser: {
    exists: boolean;
    id: string | null;
    email: string | null;
  };
  profile: {
    tableExists: boolean;
    recordExists: boolean;
    data: any;
    error: string | null;
  };
  teacher: {
    recordExists: boolean;
    data: any;
    error: string | null;
  };
  school: {
    recordExists: boolean;
    data: any;
    error: string | null;
  };
  foreignKeys: {
    teachers_user_id: boolean;
    schools_user_id: boolean;
  };
}

/**
 * Check database state for a given user ID
 */
export async function checkDatabaseState(userId: string | null): Promise<DatabaseStateCheck> {
  console.log('=== DATABASE STATE CHECK ===');
  console.log('Checking for userId:', userId);

  const checks: DatabaseStateCheck = {
    authUser: {
      exists: false,
      id: null,
      email: null,
    },
    profile: {
      tableExists: false,
      recordExists: false,
      data: null,
      error: null,
    },
    teacher: {
      recordExists: false,
      data: null,
      error: null,
    },
    school: {
      recordExists: false,
      data: null,
      error: null,
    },
    foreignKeys: {
      teachers_user_id: false,
      schools_user_id: false,
    },
  };

  try {
    // Check auth user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    checks.authUser = {
      exists: !!user,
      id: user?.id || null,
      email: user?.email || null,
    };

    console.log('1. Auth User:', checks.authUser);

    if (!userId && user) {
      userId = user.id;
      console.log('Using auth user ID:', userId);
    }

    if (!userId) {
      console.log('No userId provided and no auth user found');
      console.log('=== END DATABASE CHECK (No User) ===');
      return checks;
    }

    // Check if profiles table exists and has record
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    checks.profile = {
      tableExists: !profileError || profileError.code !== '42P01',
      recordExists: !!profile,
      data: profile,
      error: profileError?.message || null,
    };

    console.log('2. Profile Table Check:', checks.profile);

    // Check users table
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('3. Users Table Check:', {
      exists: !!userRecord,
      data: userRecord,
      error: userRecordError?.message || null,
    });

    // Check teacher record
    const { data: teacher, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    checks.teacher = {
      recordExists: !!teacher,
      data: teacher,
      error: teacherError?.message || null,
    };

    console.log('4. Teacher Record:', checks.teacher);

    // Check school record
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    checks.school = {
      recordExists: !!school,
      data: school,
      error: schoolError?.message || null,
    };

    console.log('5. School Record:', checks.school);

    // Check foreign key constraints (by attempting a query that would fail if FK doesn't exist)
    // This is a heuristic check - we'll try to query with a non-existent user_id
    const { error: fkCheckError } = await supabase
      .from('teachers')
      .select('user_id')
      .limit(0);

    checks.foreignKeys.teachers_user_id = !fkCheckError || !fkCheckError.message.includes('does not exist');

    const { error: fkSchoolCheckError } = await supabase
      .from('schools')
      .select('user_id')
      .limit(0);

    checks.foreignKeys.schools_user_id = !fkSchoolCheckError || !fkSchoolCheckError.message.includes('does not exist');

    console.log('6. Foreign Key Checks:', checks.foreignKeys);

    console.log('=== END DATABASE CHECK ===');
    console.log('Full State:', JSON.stringify(checks, null, 2));

    return checks;
  } catch (error: any) {
    console.error('=== DATABASE CHECK ERROR ===');
    console.error('Error:', {
      message: error.message,
      code: error.code,
      fullError: error,
    });
    return checks;
  }
}

/**
 * Call this function on app load or when debugging
 * Usage: checkDatabaseState(null) - will use current auth user
 */
export async function debugDatabaseOnLoad() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await checkDatabaseState(user.id);
  } else {
    console.log('No authenticated user - skipping database check');
  }
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).debugDatabase = checkDatabaseState;
  (window as any).debugDatabaseOnLoad = debugDatabaseOnLoad;
  console.log('🔍 Debug functions available:');
  console.log('  - window.debugDatabase(userId) - Check database state for a user');
  console.log('  - window.debugDatabaseOnLoad() - Check database state for current user');
}

