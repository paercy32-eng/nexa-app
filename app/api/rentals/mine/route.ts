export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency'; // 👈 Added this

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // 👈 1. Fetch the user's currency from the database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('currency')
      .eq('id', session.userId)
      .single();

    if (userError) throw userError;
    const userCurrency = user?.currency || 'UGX';

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
        // 👈 2. Convert all money fields from UGX to the user's currency
        price_paid: convertFromUGX(m.price_paid, userCurrency),
        daily_profit: convertFromUGX(m.daily_return, userCurrency), 
        total_earned: convertFromUGX(m.total_credited, userCurrency),
        duration_days: m.cycle_days,  
        days_remaining: daysRemaining,
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
