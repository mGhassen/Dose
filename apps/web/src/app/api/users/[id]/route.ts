import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { User, UpdateUserData } from '@kit/lib/api/users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper to convert UUID to numeric ID (same as in route.ts)
function uuidToNumber(uuid: string): number {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    const char = uuid.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function transformAccountToUser(account: any, profile: any = null): User {
  const numericId = profile?.id ? Number(profile.id) : uuidToNumber(account.id);
  const roleId = account.is_admin ? 2 : 0;
  const isActive = account.status === 'active';
  
  return {
    id: numericId,
    firstName: profile?.first_name || null,
    lastName: profile?.last_name || null,
    email: account.email,
    phoneNumber: profile?.phone || null,
    address: profile?.address || null,
    department: null,
    comment: null,
    isActive,
    roleId,
    createdAt: account.created_at || new Date().toISOString(),
    updatedAt: account.updated_at || new Date().toISOString(),
    isDeletable: !account.is_admin,
  };
}

function createSupabaseClient(authHeader: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(authHeader);

    // Find account by profile_id first (most reliable since profile_id is BIGINT)
    let account = null;
    let profile = null;

    // First, try to find account by profile_id
    const { data: accountsByProfile } = await supabase
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
      .eq('profile_id', numericId)
      .maybeSingle();

    if (accountsByProfile) {
      account = accountsByProfile;
      profile = accountsByProfile.profiles;
    } else {
      // If not found by profile_id, search all accounts and match by hash
      const { data: allAccounts } = await supabase
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
        `);

      if (allAccounts) {
        for (const acc of allAccounts) {
          const accNumericId = acc.profiles?.id ? Number(acc.profiles.id) : uuidToNumber(acc.id);
          if (accNumericId === numericId) {
            account = acc;
            profile = acc.profiles;
            break;
          }
        }
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = transformAccountToUser(account, profile);
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error in GET /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const body: UpdateUserData = await request.json();

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(authHeader);

    // Find the account (same logic as GET)
    let account = null;
    let profile = null;

    // Try to find by profile_id first
    const { data: accountsByProfile } = await supabase
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
      .eq('profile_id', numericId)
      .maybeSingle();

    if (accountsByProfile) {
      account = accountsByProfile;
      profile = accountsByProfile.profiles;
    } else {
      // Search all accounts and match by hash
      const { data: allAccounts } = await supabase
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
        `);

      if (allAccounts) {
        for (const acc of allAccounts) {
          const accNumericId = acc.profiles?.id ? Number(acc.profiles.id) : uuidToNumber(acc.id);
          if (accNumericId === numericId) {
            account = acc;
            profile = acc.profiles;
            break;
          }
        }
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update account
    const updates: any = {};
    if (body.email !== undefined) updates.email = body.email;
    if (body.roleId !== undefined) updates.is_admin = body.roleId === 2;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', account.id);

      if (updateError) throw updateError;
    }

    // Update profile if needed (firstName, lastName, etc.)
    // Note: UpdateUserData doesn't include these, but we could extend it

    // Fetch updated account
    const { data: updatedAccount } = await supabase
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
      .eq('id', account.id)
      .single();

    if (!updatedAccount) {
      return NextResponse.json(
        { error: 'Failed to fetch updated user' },
        { status: 500 }
      );
    }

    const user = transformAccountToUser(updatedAccount, updatedAccount.profiles);
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error in PUT /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);

    if (isNaN(numericId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createSupabaseClient(authHeader);

    // Find account by profile_id
    let account = null;
    
    const { data: accountByProfile } = await supabase
      .from('accounts')
      .select('id, is_admin')
      .eq('profile_id', numericId)
      .maybeSingle();

    if (accountByProfile) {
      account = accountByProfile;
    } else {
      // Search all accounts and match by hash
      const { data: allAccounts } = await supabase
        .from('accounts')
        .select('id, is_admin, profile_id, profiles(id)');

      if (allAccounts) {
        for (const acc of allAccounts) {
          const accNumericId = acc.profiles?.id ? Number(acc.profiles.id) : uuidToNumber(acc.id);
          if (accNumericId === numericId) {
            account = acc;
            break;
          }
        }
      }
    }

    if (!account) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (account.is_admin) {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete account (this will cascade or set profile_id to null based on schema)
    const { error: deleteError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', account.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error('Error in DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}
