export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

// Base minimum in UGX (which we convert to local currency)
const BASE_MIN_WITHDRAW_UGX = 4000;
const WITHDRAW_OPEN_HOUR = 9;
const WITHDRAW_CLOSE_HOUR = 17;
const DAILY_LIMIT = 2;

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .maybeSingle();

    if (userErr || !user) return NextResponse.json({ error: 'User account not found.' }, { status: 404 });
    if (user.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

    const bypass = user.bypass_withdraw_limits === true;
    const userCurrency = user.currency || 'UGX';
    const localMinWithdraw = convertFromUGX(BASE_MIN_WITHDRAW_UGX, userCurrency);

    // 1. 🚨 Check for Active Product
    if (!bypass) {
      const { count: activeProducts } = await supabaseAdmin
        .from('user_modules')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.userId)
        .eq('status', 'active');

      if (!activeProducts || activeProducts === 0) {
        return NextResponse.json({ error: 'You must have an active asset to withdraw.' }, { status: 400 });
      }
    }

    // 2. Time window check
    if (!bypass) {
      const nowUTC = new Date();
      const eatHour = (nowUTC.getUTCHours() + 3) % 24;
      const eatTotalMinutes = eatHour * 60 + nowUTC.getUTCMinutes();
      const openTotalMinutes = WITHDRAW_OPEN_HOUR * 60;
      const closeTotalMinutes = WITHDRAW_CLOSE_HOUR * 60;

      if (eatTotalMinutes < openTotalMinutes || eatTotalMinutes >= closeTotalMinutes) {
        return NextResponse.json({ error: `Withdrawals are only available between 7:00 AM and 5:00 PM EAT.` }, { status: 400 });
      }
    }

    // 3. Daily limit check
    if (!bypass) {
      const nowEat = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const startOfDayEat = new Date(
        Date.UTC(nowEat.getUTCFullYear(), nowEat.getUTCMonth(), nowEat.getUTCDate(), 0, 0, 0, 0) - 3 * 60 * 60 * 1000
      );

      const { count: todayCount } = await supabaseAdmin
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.userId)
        .gte('created_at', startOfDayEat.toISOString());

      if ((todayCount ?? 0) >= DAILY_LIMIT) {
        return NextResponse.json({ error: `You can only submit ${DAILY_LIMIT} withdrawal request per day.` }, { status: 400 });
      }
    }

    // 4. Duplicate pending check
    const { data: existingPending } = await supabaseAdmin
      .from('withdrawals')
      .select('id, amount')
      .eq('user_id', session.userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: `You already have a pending withdrawal of ${userCurrency} ${Number(existingPending.amount).toLocaleString()}.` }, { status: 400 });
    }

    // 5. Parse body and validate amount
    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount) || numAmount < localMinWithdraw) {
      return NextResponse.json({ error: `Minimum withdrawal is ${userCurrency} ${localMinWithdraw.toLocaleString()}` }, { status: 400 });
    }
    
    // 6. Check bound account details
    const payoutPhone = user.bound_phone;
    const payoutName = user.bound_name;

    if (!payoutPhone || !payoutName) {
      return NextResponse.json({ error: 'Please bind your mobile money account in the profile page first.' }, { status: 400 });
    }

    // 7. Check balance
    if (Number(user.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 8. Deduct balance and create withdrawal
    await supabaseAdmin
      .from('users')
      .update({ balance: Number(user.balance) - numAmount })
      .eq('id', session.userId);

    const { data: withdrawal, error: insErr } = await supabaseAdmin
      .from('withdrawals')
      .insert({
        user_id: session.userId,
        amount: numAmount,
        currency: userCurrency,
        gateway: user.country === 'UG' ? 'pesajet' : 'marzpay',
        status: 'pending',
        recipient_phone: payoutPhone,
        recipient_name: payoutName,
      })
      .select('id, amount, status, created_at')
      .single();

    if (insErr || !withdrawal) {
      await supabaseAdmin.from('users').update({ balance: Number(user.balance) }).eq('id', session.userId);
      return NextResponse.json({ error: 'Failed to create withdrawal request' }, { status: 500 });
    }

    // 9. Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'withdrawal_request',
      amount: numAmount,
      status: 'pending',
      meta: { withdrawal_id: withdrawal.id, phone: payoutPhone, full_name: payoutName },
    });

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawal.id,
      amount: numAmount,
      netAmount: Math.round(numAmount * 0.87), // 🚨 13% fee (87% net)
      fee: Math.round(numAmount * 0.13),
    });

  } catch (err) {
    console.error('Withdrawal create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
