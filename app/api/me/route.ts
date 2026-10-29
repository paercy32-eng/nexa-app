export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Fetch all user data, including the new country and currency columns
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate total deposited from the 'deposits' table
    let totalDeposited = 0;
    const { data: deposits } = await supabaseAdmin
      .from('deposits')
      .select('amount')
      .eq('user_id', session.userId)
      .eq('status', 'completed');

    if (deposits) {
      totalDeposited = deposits.reduce((sum, d) => sum + Number(d.amount), 0);
    }

    return NextResponse.json(
      { 
        user: {
          ...user,
          total_deposited: totalDeposited,
          total_withdrawn: Number(user.total_withdrawn || 0)
        } 
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('Me error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
