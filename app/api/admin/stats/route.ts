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

    // 2. Fetch Deposits (Completed)
    const { data: deposits } = await supabaseAdmin
      .from('deposits')
      .select('amount, currency')
      .eq('status', 'completed');

    // 3. Fetch Withdrawals (Completed)
    const { data: withdrawals } = await supabaseAdmin
      .from('withdrawals')
      .select('amount') // Assuming withdrawals don't have a currency column yet
      .eq('status', 'completed');

    // 4. Fetch Investments (All user modules)
    const { data: modules } = await supabaseAdmin
      .from('user_modules')
      .select('price_paid');

    // 👈 Group everything by currency
    const byCurrency: Record<string, { deposited: number; withdrawn: number; invested: number }> = {
      UGX: { deposited: 0, withdrawn: 0, invested: 0 },
      RWF: { deposited: 0, withdrawn: 0, invested: 0 },
      ZMW: { deposited: 0, withdrawn: 0, invested: 0 },
    };

    const ensureCurrency = (curr: string) => {
      if (!byCurrency[curr]) {
        byCurrency[curr] = { deposited: 0, withdrawn: 0, invested: 0 };
      }
    };

    // Calculate Deposits
    (deposits ?? []).forEach(d => {
      const curr = d.currency || 'UGX';
      ensureCurrency(curr);
      byCurrency[curr].deposited += Number(d.amount);
    });

    // Calculate Withdrawals (Defaulting to UGX since schema didn't have currency earlier)
    (withdrawals ?? []).forEach(w => {
      const curr = 'UGX'; // Change this to w.currency if your table has it
      ensureCurrency(curr);
      byCurrency[curr].withdrawn += Number(w.amount);
    });

    // Calculate Invested (All investments are stored in UGX base)
    (modules ?? []).forEach(m => {
      const curr = 'UGX'; 
      ensureCurrency(curr);
      byCurrency[curr].invested += Number(m.price_paid);
    });

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      byCurrency,
    });

  } catch (err: any) {
    console.error('Stats API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
