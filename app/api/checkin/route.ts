export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

const BASE_CHECKIN_BONUS_UGX = 200;

// Helper: Get the YYYY-MM-DD string in East Africa Time (UTC+3)
function getEATDateString(date: Date) {
  const eatTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return eatTime.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('last_checkin_at, currency')
      .eq('id', session.userId)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let canCheckIn = true;
    if (user.last_checkin_at) {
      const nowUTC = new Date();
      const todayEAT = getEATDateString(nowUTC);
      const lastCheckinDate = new Date(user.last_checkin_at);
      const lastCheckinEAT = getEATDateString(lastCheckinDate);

      if (lastCheckinEAT === todayEAT) {
        canCheckIn = false;
      }
    }

    const localBonus = convertFromUGX(BASE_CHECKIN_BONUS_UGX, user.currency || 'UGX');

    return NextResponse.json({
      canCheckIn,
      bonus: localBonus,
      lastCheckinAt: user.last_checkin_at,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, balance, last_checkin_at, currency')
      .eq('id', session.userId)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const nowUTC = new Date();
    const todayEAT = getEATDateString(nowUTC);

    if (user.last_checkin_at) {
      const lastCheckinDate = new Date(user.last_checkin_at);
      const lastCheckinEAT = getEATDateString(lastCheckinDate);

      if (lastCheckinEAT === todayEAT) {
        return NextResponse.json({ error: 'You have already checked in today. Come back tomorrow!' }, { status: 400 });
      }
    }

    // Convert 200 UGX to local currency
    const localBonus = convertFromUGX(BASE_CHECKIN_BONUS_UGX, user.currency || 'UGX');
    const newBalance = Number(user.balance ?? 0) + localBonus;

    // 1. Update User Balance & Check-in Time
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        balance: newBalance,
        last_checkin_at: nowUTC.toISOString(),
      })
      .eq('id', session.userId)
      .select('balance')
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json({ error: 'Database failed to update balance' }, { status: 500 });
    }

    // 2. Log the transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'daily_checkin',
      amount: localBonus,
      status: 'completed',
      meta: { reason: 'Daily check-in bonus' },
    });

    return NextResponse.json({
      success: true,
      bonus: localBonus,
      newBalance: updatedUser.balance,
      message: `You received ${user.currency} ${localBonus.toLocaleString()} for checking in today!`,
    });

  } catch (err) {
    console.error('Check-in error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
