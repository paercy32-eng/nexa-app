export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { pesajet } from '@/lib/pesajet';

// Basic minimums per currency (You can adjust these later)
const MIN_DEPOSITS: Record<string, number> = {
  UGX: 2000,
  KES: 100,
  RWF: 1000,
  ZMW: 50,
  XAF: 1000,
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

    // 1. Load user to get their country and currency
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, country, currency')
      .eq('id', session.userId)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const userCurrency = user.currency || 'UGX';
    const minDeposit = MIN_DEPOSITS[userCurrency] || 2000;

    if (numAmount < minDeposit) {
      return NextResponse.json({ error: `Minimum deposit is ${minDeposit.toLocaleString()} ${userCurrency}` }, { status: 400 });
    }

    const reference = crypto.randomUUID();
    const gateway = user.country === 'UG' ? 'pesajet' : 'marzpay';

    // 2. Save pending deposit in database
    const { data: deposit, error: insErr } = await supabaseAdmin
      .from('deposits')
      .insert({
        user_id: user.id,
        amount: numAmount,
        currency: userCurrency,
        gateway: gateway,
        status: 'pending',
        reference: reference,
      })
      .select('id, reference')
      .single();

    if (insErr || !deposit) {
      console.error('DB Insert Error:', insErr);
      return NextResponse.json({ error: 'Failed to create deposit record' }, { status: 500 });
    }

    // Log the pending transaction so it shows in History immediately
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: numAmount,
      type: 'deposit',
      status: 'pending',
      meta: { reference: reference, deposit_id: deposit.id }
    });

    // ==========================================
    // ROUTE A: UGANDA (PESAJET)
    // ==========================================
    if (gateway === 'pesajet') {
      try {
        const formattedPhone = pesajet.utils.formatPhoneNumber(phone);
        let provider = pesajet.utils.detectProvider(phone);
        if (!provider) provider = 'mtn'; 

        const payment = await pesajet.payments.create({
          amount: numAmount,
          currency: 'UGX',
          phoneNumber: formattedPhone,
          provider: provider,
          reference: reference,
          description: `Nexa Deposit for ${user.name || user.phone}`,
        });

        return NextResponse.json({
          success: true,
          depositId: deposit.id,
          reference,
          amount: numAmount,
          message: 'A PIN prompt was sent to your phone.',
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
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-nexa-domain.com';

        if (!marzpayKey || !marzpaySecret) {
          throw new Error('MarzPay credentials are not configured in Vercel');
        }

        const authToken = Buffer.from(`${marzpayKey}:${marzpaySecret}`).toString('base64');

        // Note: You may need to adjust the 'country' parameter depending on how MarzPay expects it (e.g., 'KE', 'RW')
        const marzpayRes = await fetch(`${marzpayBaseUrl}/collect-money`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            amount: numAmount,
            phone_number: phone, // You may need to normalize this to +254..., +250... etc.
            country: user.country, // 'KE', 'RW', 'ZM', 'CM'
            reference: reference,
            callback_url: `${appUrl}/api/webhooks/marzpay`,
            description: `Nexa Deposit for ${user.name || user.phone}`,
            metadata: [{ depositId: deposit.id }],
          }),
        });

        const marzpayData = await marzpayRes.json().catch(() => ({}));

        if (!marzpayRes.ok || marzpayData?.status === 'error') {
          console.error('MarzPay collect failed:', marzpayData);
          await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
          await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
          return NextResponse.json({ error: marzpayData?.message || 'MarzPay request failed' }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          depositId: deposit.id,
          reference,
          amount: numAmount,
          message: 'A PIN prompt was sent to your phone.',
        });

      } catch (apiError: any) {
        console.error('MarzPay API Error:', apiError);
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
        return NextResponse.json({ error: apiError.message || 'Payment gateway rejected the request' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unsupported country configuration' }, { status: 400 });

  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
