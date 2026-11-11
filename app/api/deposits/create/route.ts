export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

const BASE_MIN_DEPOSIT_UGX = 20000; 

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { amount, phone, transactionId } = await req.json();
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, country, currency')
      .eq('id', session.userId)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userCurrency = user.currency || 'UGX';
    const userCountry = user.country || 'UG';
    
    const minDeposit = convertFromUGX(BASE_MIN_DEPOSIT_UGX, userCurrency);

    if (numAmount < minDeposit) {
      return NextResponse.json({ error: `Minimum deposit is ${userCurrency} ${minDeposit.toLocaleString()}` }, { status: 400 });
    }

    // 🚨 MANUAL DEPOSIT FOR ALL COUNTRIES
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required for manual deposits.' }, { status: 400 });
    }

    const gatewayName = userCountry === 'UG' ? 'manual_ug' : userCountry === 'ZM' ? 'manual_zm' : 'manual_rw';

    const { data: deposit, error: insErr } = await supabaseAdmin
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: numAmount,
        currency: userCurrency,
        gateway: gatewayName,
        status: 'pending',
        reference: transactionId,
      })
      .select('id')
      .single();

    if (insErr) throw insErr;

    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: numAmount,
      type: 'deposit',
      status: 'pending',
      meta: { reference: transactionId, deposit_id: deposit.id, type: gatewayName }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Deposit submitted! Admin will verify TX ID: ${transactionId} shortly.` 
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
