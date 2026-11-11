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

    const cleanCode = code.trim().toUpperCase();

    // 1. Find the code
    const { data: giftCode, error: codeError } = await supabaseAdmin
      .from('gift_codes')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (codeError || !giftCode) {
      return NextResponse.json({ error: 'Invalid gift code.' }, { status: 404 });
    }

    // 2. Check if the code has reached its max uses
    if (giftCode.times_used >= giftCode.max_uses) {
      return NextResponse.json({ error: 'This gift code has expired (max uses reached).' }, { status: 400 });
    }

    // 3. Check if THIS user has already claimed it
    const { data: existingClaim } = await supabaseAdmin
      .from('gift_code_claims')
      .select('id')
      .eq('code', cleanCode)
      .eq('user_id', session.userId)
      .maybeSingle();

    if (existingClaim) {
      return NextResponse.json({ error: 'You have already claimed this gift code.' }, { status: 400 });
    }

    // 4. Get User details
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('balance, currency')
      .eq('id', session.userId)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 🚨 5. GENERATE RANDOM AMOUNT BETWEEN 50 AND 700 UGX
    const randomUGX = Math.floor(Math.random() * (700 - 50 + 1)) + 50;
    
    // Convert the random UGX amount to the user's local currency
    const userCurrency = user.currency || 'UGX';
    const creditAmount = convertFromUGX(randomUGX, userCurrency);

    // 6. Update the code's times_used
    const { error: updateError } = await supabaseAdmin
      .from('gift_codes')
      .update({ times_used: giftCode.times_used + 1 })
      .eq('id', giftCode.id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to process code. Try again.' }, { status: 500 });
    }

    // 7. Record the claim so they can't use it again
    await supabaseAdmin.from('gift_code_claims').insert({
      code: cleanCode,
      user_id: session.userId,
      amount: creditAmount
    });

    // 8. Add to balance
    const newBalance = Number(user.balance || 0) + creditAmount;
    await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', session.userId);

    // 9. Log the transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'gift_code',
      amount: creditAmount,
      status: 'completed',
      meta: { code: giftCode.code, original_ugx: randomUGX },
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
