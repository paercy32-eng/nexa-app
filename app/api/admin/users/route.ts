export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Admin Session (using the admin cookie)
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Admin users fetch error:', error);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    return NextResponse.json(
      { users: users ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Admin users error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
