export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Fetch the user's active assets from the database
    const { data: modules, error } = await supabaseAdmin
      .from('user_modules')
      .select('*')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the database columns to match what the frontend needs
    const formattedRentals = (modules ?? []).map(m => {
      const daysRemaining = Math.max(0, m.cycle_days - m.days_credited);
      
      return {
        id: m.id,
        product_name: m.product_name,
        price_paid: m.price_paid,
        daily_profit: m.daily_return, 
        duration_days: m.cycle_days,  
        days_remaining: daysRemaining,
        total_earned: m.total_credited,
        start_at: m.started_at, 
        last_credit_at: m.started_at, 
        status: m.status
      };
    });

    return NextResponse.json({ rentals: formattedRentals });
  } catch (err) {
    console.error('Fetch rentals error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
