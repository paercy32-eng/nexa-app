export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { pesajet } from '@/lib/pesajet';
import { convertFromUGX } from '@/lib/currency';

const BASE_MIN_DEPOSIT_UGX = 20000; 
const PESAJET_FEE_RATE = 0.025; 

// MarzPay flat fees (can adjust based on exact RWF needs)
const MARZPAY_FEES: Record<string, number> = {
  KES: 5, RWF: 100, ZMW: 2, XAF: 100,
};

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

    const reference = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.aurua.shop';

    // ==========================================
    // ROUTE A: ZAMBIA (MANUAL DEPOSIT)
    // ==========================================
    if (userCountry === 'ZM') {
      if (!transactionId) return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });

      const { data: deposit, error: insErr } = await supabaseAdmin
        .from('deposits')
        .insert({
          user_id: user.id,
          amount: numAmount,
          currency: userCurrency,
          gateway: 'manual_zm',
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
        meta: { reference: transactionId, deposit_id: deposit.id, type: 'manual_zm' }
      });

      return NextResponse.json({ success: true, message: `Deposit submitted! Admin will verify TX ID: ${transactionId} shortly.` });
    }

    // ==========================================
    // ROUTE B: UGANDA (PESAJET AUTOMATED)
    // ==========================================
    if (userCountry === 'UG') {
      let amountToPrompt = Math.ceil(numAmount / (1 - PESAJET_FEE_RATE));

      const { data: deposit, error: insErr } = await supabaseAdmin
        .from('deposits')
        .insert({
          user_id: user.id, amount: numAmount, currency: userCurrency, gateway: 'pesajet', status: 'pending', reference: reference,
        })
        .select('id, reference')
        .single();

      if (insErr) throw insErr;

      await supabaseAdmin.from('transactions').insert({
        user_id: user.id, amount: numAmount, type: 'deposit', status: 'pending',
        meta: { reference: reference, deposit_id: deposit.id, fee_charged: amountToPrompt - numAmount }
      });

      try {
        const formattedPhone = pesajet.utils.formatPhoneNumber(phone);
        let provider = pesajet.utils.detectProvider(phone) || 'mtn'; 

        const payment = await pesajet.payments.create({
          amount: amountToPrompt, currency: 'UGX', phoneNumber: formattedPhone, provider: provider, reference: reference, description: `Nexa Deposit`,
        });

        return NextResponse.json({ 
          success: true, depositId: deposit.id, reference, amount: numAmount, transactionId: payment.transactionId,
          message: `A PIN prompt for ${amountToPrompt.toLocaleString()} UGX was sent to your phone.` 
        });

      } catch (apiError: any) {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    // ==========================================
    // ROUTE C: RWANDA & OTHERS (MARZPAY AUTOMATED)
    // ==========================================
    if (userCountry !== 'ZM' && userCountry !== 'UG') {
      try {
        const marzpayKey = process.env.MARZPAY_API_KEY;
        const marzpaySecret = process.env.MARZPAY_API_SECRET;
        const marzpayBaseUrl = 'https://wallet.wearemarz.com/api/v1';

        if (!marzpayKey || !marzpaySecret) throw new Error('MarzPay credentials missing');

        const authToken = Buffer.from(`${marzpayKey}:${marzpaySecret}`).toString('base64');
        
        // Format phone to +250...
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

        // Add MarzPay flat fee for RWF
        const marzpayFee = MARZPAY_FEES[userCurrency] || 0;
        const amountToPrompt = numAmount + marzpayFee;

        const { data: deposit, error: insErr } = await supabaseAdmin
          .from('deposits')
          .insert({
            user_id: user.id, amount: numAmount, currency: userCurrency, gateway: 'marzpay', status: 'pending', reference: reference,
          })
          .select('id')
          .single();

        if (insErr) throw insErr;

        await supabaseAdmin.from('transactions').insert({
          user_id: user.id, amount: numAmount, type: 'deposit', status: 'pending',
          meta: { reference: reference, deposit_id: deposit.id, fee_charged: marzpayFee }
        });

        // MarzPay API Call
        const marzpayRes = await fetch(`${marzpayBaseUrl}/collect-money`, {
          method: 'POST',
          headers: { 
            'Authorization': `Basic ${authToken}`, 
            'Content-Type': 'application/json', 
            Accept: 'application/json' 
          },
          body: JSON.stringify({
            amount: amountToPrompt,
            phone_number: formattedPhone,
            reference: reference,
            country: userCountry, // 'RW'
            currency: userCurrency, // 'RWF'
            description: `Nexa Deposit`,
            callback_url: `${appUrl}/api/webhooks/marzpay`, // Ensure you have this webhook route!
            metadata: [{ depositId: deposit.id }, { userId: user.id }]
          }),
        });

        const marzpayData = await marzpayRes.json().catch(() => ({}));

        if (!marzpayRes.ok || marzpayData?.status === 'error') {
          await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
          return NextResponse.json({ error: marzpayData?.message || 'MarzPay request failed' }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          depositId: deposit.id, 
          reference, 
          amount: numAmount, 
          message: `A PIN prompt for ${amountToPrompt} RWF was sent to your phone.` 
        });

      } catch (apiError: any) {
        console.error('MarzPay Error:', apiError);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unsupported country' }, { status: 400 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
                                }
