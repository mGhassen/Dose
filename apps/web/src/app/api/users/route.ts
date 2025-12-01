import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@kit/lib/supabase';
import type { User } from '@kit/lib/api/users';

// Helper to convert UUID to numeric ID (simple hash)
function uuidToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function transformAccountToUser(account: any, profile: any = null, index: number = 0): User {
  // Use profile_id if available (it's a BIGINT), otherwise hash the UUID
  const numericId = profile?.id ? Number(profile.id) : uuidToNumber(account.id);
  
  // Map is_admin to roleId: 2 = admin, 1 = manager (if we add that), 0 = user
  const roleId = account.is_admin ? 2 : 0;
  
  // Map status to isActive
  const isActive = account.status === 'active';
  
  return {
    id: numericId,
    firstName: profile?.first_name || null,
    lastName: profile?.last_name || null,
    email: account.email,
    phoneNumber: profile?.phone || null,
    address: profile?.address || null,
    department: null, // Not in accounts table
    comment: null, // Not in accounts table
    isActive,
    roleId,
    createdAt: account.created_at || new Date().toISOString(),
    updatedAt: account.updated_at || new Date().toISOString(),
    isDeletable: !account.is_admin, // Don't allow deleting admins
  };
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Create Supabase client with auth header for RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    // Fetch accounts with profiles
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select(`
        id,
        email,
        status,
        is_admin,
        profile_id,
        created_at,
        updated_at,
        profiles (
          id,
          first_name,
          last_name,
          phone,
          address
        )
      `)
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to fetch accounts', details: accountsError.message },
        { status: 500 }
      );
    }

    // Transform accounts to users
    const users: User[] = (accounts || []).map((account: any, index: number) => {
      const profile = account.profiles;
      return transformAccountToUser(account, profile, index);
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // For now, return not implemented - user creation should go through auth/register
  return NextResponse.json(
    { error: 'User creation should use /api/auth/register endpoint' },
    { status: 405 }
  );
}