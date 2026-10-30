export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Total Users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 2. Total Deposited (Completed)
    const { data: deposits } = await supabaseAdmin
      .from('deposits')
      .select('amount')
      .eq('status', 'completed');
    const totalDeposited = (deposits ?? []).reduce((sum, d) => sum + Number(d.amount), 0);

    // 3. Total Withdrawn (Completed)
    const { data: withdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('amount')
      .eq('status', 'completed');
    const totalWithdrawn = (withdrawals ?? []).reduce((sum, w) => sum + Number(w.amount), 0);

    // 4. Total Invested (All user modules)
    const { data: modules } = await supabaseAdmin
      .from('user_modules')
      .select('price_paid');
    const totalInvested = (modules ?? []).reduce((sum, m) => sum + Number(m.price_paid), 0);

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      totalDeposited,
      totalWithdrawn,
      totalInvested,
    });

  } catch (err: any) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
