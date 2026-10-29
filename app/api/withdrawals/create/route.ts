export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

const MIN_WITHDRAWS: Record<string, number> = {
  UGX: 4000,
  KES: 200,
  RWF: 2000,
  ZMW: 100,
  XAF: 2000,
};

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

    const userCurrency = user.currency || 'UGX';
    const minWithdraw = MIN_WITHDRAWS[userCurrency] || 4000;

    // 1. Check for Active Pump in 'user_modules'
    const { count: activePumps } = await supabaseAdmin
      .from('user_modules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId)
      .eq('status', 'active');

    if (!activePumps || activePumps === 0) {
      return NextResponse.json({ error: 'You must have an active investment to withdraw.' }, { status: 400 });
    }

    // 2. Duplicate pending check
    const { data: existingPending } = await supabaseAdmin
      .from('withdrawals')
      .select('id, amount')
      .eq('user_id', session.userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json({ error: `You already have a pending withdrawal of ${Number(existingPending.amount).toLocaleString()} ${userCurrency}.` }, { status: 400 });
    }

    // 3. Parse body and validate amount
    const { amount } = await req.json();
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount) || numAmount < minWithdraw) {
      return NextResponse.json({ error: `Minimum withdrawal is ${minWithdraw.toLocaleString()} ${userCurrency}` }, { status: 400 });
    }
    
    // 4. Check bound account details
    const payoutPhone = user.bound_phone;
    const payoutName = user.bound_name;

    if (!payoutPhone || !payoutName) {
      return NextResponse.json({ error: 'Please bind your mobile money account in the profile page first.' }, { status: 400 });
    }

    // 5. Check balance
    if (Number(user.balance) < numAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 6. Deduct balance and create withdrawal
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

    // 7. Log transaction
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
      netAmount: Math.round(numAmount * 0.84), 
      fee: Math.round(numAmount * 0.16),
    });

  } catch (err) {
    console.error('Withdrawal create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
