export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { code } = await req.json();
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

    // 1. Find the code
    const { data: giftCode, error: codeError } = await supabaseAdmin
      .from('gift_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (codeError || !giftCode) {
      return NextResponse.json({ error: 'Invalid gift code.' }, { status: 404 });
    }

    if (giftCode.is_used) {
      return NextResponse.json({ error: 'This code has already been used.' }, { status: 400 });
    }

    // 2. Mark it as used safely (prevents race conditions)
    const { error: updateError } = await supabaseAdmin
      .from('gift_codes')
      .update({ is_used: true, used_by: session.userId })
      .eq('id', giftCode.id)
      .eq('is_used', false); // Ensures it hasn't been claimed milliseconds ago

    if (updateError) {
      return NextResponse.json({ error: 'Failed to redeem code. Try again.' }, { status: 500 });
    }

    // 3. Get User details (currency and current balance)
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, currency')
      .eq('id', session.userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 4. Convert UGX amount to user's local currency
    const userCurrency = user.currency || 'UGX';
    const creditAmount = convertFromUGX(Number(giftCode.amount), userCurrency);

    // 5. Add to balance
    const newBalance = Number(user.balance || 0) + creditAmount;
    await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', session.userId);

    // 6. Log the transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'gift_code',
      amount: creditAmount,
      status: 'completed',
      meta: { code: giftCode.code, original_ugx: giftCode.amount },
    });

    return NextResponse.json({
      success: true,
      amount: creditAmount,
      currency: userCurrency,
    });

  } catch (err) {
    console.error('Redeem error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
        }
