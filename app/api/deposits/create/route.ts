export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { pesajet } from '@/lib/pesajet';
import { convertFromUGX } from '@/lib/currency';

const BASE_MIN_DEPOSIT_UGX = 20000; 

// 🚨 PesaJet charges 2.5%
const PESAJET_FEE_RATE = 0.025; 

const MARZPAY_FEES: Record<string, number> = {
  KES: 5, RWF: 100, ZMW: 2, XAF: 100,
};

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { amount, phone } = await req.json();
    const numAmount = Number(amount);

    if (!numAmount || isNaN(numAmount)) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

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
    const gateway = userCountry === 'UG' ? 'pesajet' : 'marzpay';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nexa.vortexgain.com';

    let amountToPrompt = numAmount;

    // 🚨 GROSS-UP CALCULATION: Add the PesaJet fee on top
    if (gateway === 'pesajet') {
      // Math: Amount / (1 - Fee) ensures the business receives the exact amount after the fee is deducted.
      amountToPrompt = Math.ceil(numAmount / (1 - PESAJET_FEE_RATE));
    } else {
      // MarzPay uses flat fees
      const marzpayFee = MARZPAY_FEES[userCurrency] || 0;
      amountToPrompt = numAmount + marzpayFee;
    }

    // 1. Save pending deposit (We save 'numAmount' so the user gets credited exactly what they asked for)
    const { data: deposit, error: insErr } = await supabaseAdmin
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: numAmount, // Credited amount
        currency: userCurrency,
        gateway: gateway,
        status: 'pending',
        reference: reference,
      })
      .select('id, reference')
      .single();

    if (insErr || !deposit) {
      return NextResponse.json({ error: 'Failed to create deposit record' }, { status: 500 });
    }

    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: numAmount,
      type: 'deposit',
      status: 'pending',
      meta: { reference: reference, deposit_id: deposit.id, fee_charged: amountToPrompt - numAmount }
    });

    // ==========================================
    // ROUTE A: UGANDA (PESAJET)
    // ==========================================
    if (gateway === 'pesajet') {
      try {
        const formattedPhone = pesajet.utils.formatPhoneNumber(phone);
        let provider = pesajet.utils.detectProvider(phone);
        if (!provider) provider = 'mtn'; 

        // 🚨 Send the TOTAL amount (numAmount + PesaJet fee) to PesaJet
        const payment = await pesajet.payments.create({
          amount: amountToPrompt, 
          currency: 'UGX',
          phoneNumber: formattedPhone,
          provider: provider,
          reference: reference,
          description: `Nexa Deposit`,
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
        console.error('PesaJet API Error:', apiError);
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    // ==========================================
    // ROUTE B: OTHER AFRICAN COUNTRIES (MARZPAY)
    // ==========================================
    if (gateway === 'marzpay') {
      try {
        const marzpayKey = process.env.MARZPAY_API_KEY;
        const marzpaySecret = process.env.MARZPAY_API_SECRET;
        const marzpayBaseUrl = 'https://wallet.wearemarz.com/api/v1';

        if (!marzpayKey || !marzpaySecret) throw new Error('MarzPay credentials missing');

        const authToken = Buffer.from(`${marzpayKey}:${marzpaySecret}`).toString('base64');
        let formattedPhone = phone.trim();
        if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

        const marzpayRes = await fetch(`${marzpayBaseUrl}/collect-money`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${authToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            amount: amountToPrompt, // Total + Fee for MarzPay
            phone_number: formattedPhone,
            reference: reference,
            country: userCountry,
            description: `Nexa Deposit`,
            callback_url: `${appUrl}/api/webhooks/marzpay`,
            metadata: [{ depositId: deposit.id }, { userId: user.id }]
          }),
        });

        const marzpayData = await marzpayRes.json().catch(() => ({}));

        if (!marzpayRes.ok || marzpayData?.status === 'error') {
          await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
          await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
          return NextResponse.json({ error: marzpayData?.message || 'MarzPay request failed' }, { status: 400 });
        }

        return NextResponse.json({ success: true, depositId: deposit.id, reference, amount: numAmount, message: `A PIN prompt for ${amountToPrompt} ${userCurrency} was sent to your phone.` });
      } catch (apiError: any) {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unsupported country' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
          }
