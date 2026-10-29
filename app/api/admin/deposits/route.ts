export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'all';

    let query = supabaseAdmin
      .from('deposits')
      .select('*');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Admin deposits fetch error:', error);
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    // Fetch user details for each deposit
    const userIds = Array.from(new Set((data ?? []).map((d) => d.user_id)));
    let userMap: Record<string, { name: string; phone: string; country: string }> = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, country')
        .in('id', userIds);
      (users ?? []).forEach((u) => {
        userMap[u.id] = { name: u.name, phone: u.phone, country: u.country };
      });
    }

    const enriched = (data ?? []).map((d) => ({
      ...d,
      user: userMap[d.user_id] ?? null,
    }));

    return NextResponse.json(
      { deposits: enriched },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err) {
    console.error('Admin deposits error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
