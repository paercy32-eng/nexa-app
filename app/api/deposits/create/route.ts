export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { pesajet } from '@/lib/pesajet';
import { convertFromUGX } from '@/lib/currency';

const BASE_MIN_DEPOSIT_UGX = 20000; 
const PESAJET_FEE_RATE = 0.035; // 3.5% fee

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

    // 🚨 FIX: Generate a guaranteed short, alphanumeric reference (e.g., TX169987654321)
    const reference = 'TX' + Date.now().toString() + Math.floor(Math.random() * 1000).toString();
    
    // ==========================================
    // ROUTE A: MANUAL DEPOSITS (ZAMBIA & RWANDA)
    // ==========================================
    if (userCountry === 'ZM' || userCountry === 'RW') {
      if (!transactionId) {
        return NextResponse.json({ error: 'Transaction ID is required for manual deposits.' }, { status: 400 });
      }

      const gatewayName = userCountry === 'ZM' ? 'manual_zm' : 'manual_rw';

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
    }

    // ==========================================
    // ROUTE B: UGANDA (PESAJET AUTOMATED)
    // ==========================================
    if (userCountry === 'UG') {
      // Calculate amount to prompt (amount + fee)
      let amountToPrompt = Math.ceil(numAmount / (1 - PESAJET_FEE_RATE));

      const { data: deposit, error: insErr } = await supabaseAdmin
        .from('deposits')
        .insert({
          user_id: user.id, 
          amount: numAmount, 
          currency: userCurrency, 
          gateway: 'pesajet', 
          status: 'pending', 
          reference: reference,
        })
        .select('id, reference')
        .single();

      if (insErr) throw insErr;

      await supabaseAdmin.from('transactions').insert({
        user_id: user.id, 
        amount: numAmount, 
        type: 'deposit', 
        status: 'pending',
        meta: { reference: reference, deposit_id: deposit.id, fee_charged: amountToPrompt - numAmount }
      });

      try {
        const formattedPhone = pesajet.utils.formatPhoneNumber(phone);
        let provider = pesajet.utils.detectProvider(phone) || 'mtn'; 

        const payment = await pesajet.payments.create({
          amount: amountToPrompt, 
          currency: 'UGX', 
          phoneNumber: formattedPhone, 
          provider: provider, 
          reference: reference, 
          description: `Cadbury Deposit`,
        });

        return NextResponse.json({ 
          success: true, 
          depositId: deposit.id, 
          reference, 
          amount: numAmount, 
          transactionId: payment.transactionId,
          message: `A PIN prompt for ${amountToPrompt.toLocaleString()} UGX was sent to your phone.` 
        });

      } catch (apiError: any) {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unsupported country' }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
