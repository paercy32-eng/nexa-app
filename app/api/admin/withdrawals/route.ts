export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { pesajet } from '@/lib/pesajet';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'pending';

    let query = supabaseAdmin.from('withdrawals').select('*');
    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: 'Failed to load' }, { status: 500 });

    const userIds = Array.from(new Set((data ?? []).map((w) => w.user_id)));
    let userMap: Record<string, { name: string; phone: string; country: string }> = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin.from('users').select('id, name, phone, country').in('id', userIds);
      (users ?? []).forEach((u) => { userMap[u.id] = { name: u.name, phone: u.phone, country: u.country }; });
    }

    const enriched = (data ?? []).map((w) => ({
      ...w,
      user: userMap[w.user_id] ?? null,
    }));

    return NextResponse.json(
      { withdrawals: enriched },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { withdrawalId, action } = await req.json();

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Fetch withdrawal and user's country
    const { data: wd } = await supabaseAdmin
      .from('withdrawals')
      .select('*, users(country)')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wd) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    if (wd.status !== 'pending') return NextResponse.json({ error: `Already ${wd.status}` }, { status: 400 });

    const userCountry = wd.users?.country || 'UG';

    // ==============================
    // APPROVE
    // ==============================
    if (action === 'approve') {
      // 🚨 CHANGED: 13% fee (User gets 87%)
      const userNet = Math.round(Number(wd.amount) * 0.87); 
      const reference = crypto.randomUUID();

      try {
        // ROUTING: PesaJet for UG, MarzPay for others
        if (wd.gateway === 'pesajet' || userCountry === 'UG') {
           const formattedPhone = pesajet.utils.formatPhoneNumber(wd.recipient_phone);
           let provider = pesajet.utils.detectProvider(wd.recipient_phone);
           if (!provider) provider = 'mtn'; 

           await pesajet.payments.create({
             type: 'DISBURSEMENT',
             amount: userNet,
             currency: wd.currency,
             phoneNumber: formattedPhone,
             provider: provider,
             reference: reference,
             description: `Nexa Withdrawal for ${wd.recipient_name}`,
           });
           console.log('PesaJet Payout initiated');

        } else {
           // MARZPAY PAYOUT FOR KE, RW, ZM, CM
           const marzpayKey = process.env.MARZPAY_API_KEY;
           const marzpaySecret = process.env.MARZPAY_API_SECRET;
           const marzpayBaseUrl = 'https://wallet.wearemarz.com/api/v1';
           const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nexa-app-flame.vercel.app';

           if (!marzpayKey || !marzpaySecret) {
             throw new Error('MarzPay API credentials are missing.');
           }

           const authToken = Buffer.from(`${marzpayKey}:${marzpaySecret}`).toString('base64');

           let formattedPhone = wd.recipient_phone.trim();
           if (!formattedPhone.startsWith('+')) formattedPhone = `+${formattedPhone}`;

           const marzpayRes = await fetch(`${marzpayBaseUrl}/send-money`, {
             method: 'POST',
             headers: {
               'Authorization': `Basic ${authToken}`,
               'Content-Type': 'application/json',
               Accept: 'application/json',
             },
             body: JSON.stringify({
               amount: userNet,
               phone_number: formattedPhone,
               reference: reference,
               country: userCountry, 
               description: `Nexa Withdrawal for ${wd.recipient_name}`,
               callback_url: `${appUrl}/api/webhooks/marzpay`,
               metadata: [{ withdrawalId: wd.id }]
             }),
           });

           const marzpayData = await marzpayRes.json().catch(() => ({}));

           if (!marzpayRes.ok || marzpayData?.status === 'error') {
             console.error('MarzPay payout failed:', marzpayData);
             throw new Error(marzpayData?.message || 'MarzPay payout failed');
           }

           console.log('MarzPay Payout initiated:', marzpayData);
        }

        // If API call is successful, mark as completed
        await supabaseAdmin.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawalId);
        await supabaseAdmin.from('transactions').update({ status: 'completed', type: 'withdrawal' }).eq('meta->>withdrawal_id', withdrawalId);

        return NextResponse.json({ success: true, status: 'completed' });

      } catch (apiError: any) {
        console.error('Payout error:', apiError);
        
        // If payout fails, mark as failed and REFUND the user
        await supabaseAdmin.from('withdrawals').update({ status: 'failed' }).eq('id', withdrawalId);
        
        const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', wd.user_id).maybeSingle();
        await supabaseAdmin.from('users').update({ balance: Number(user?.balance ?? 0) + Number(wd.amount) }).eq('id', wd.user_id);
        
        await supabaseAdmin.from('transactions').update({ status: 'failed', type: 'withdrawal_failed' }).eq('meta->>withdrawal_id', withdrawalId);

        return NextResponse.json({ error: apiError.message || 'Payout failed. User refunded.' }, { status: 400 });
      }
    }

    // ==============================
    // REJECT
    // ==============================
    if (action === 'reject') {
      await supabaseAdmin.from('withdrawals').update({ status: 'rejected' }).eq('id', withdrawalId);
      
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', wd.user_id).maybeSingle();
      await supabaseAdmin.from('users').update({ balance: Number(user?.balance ?? 0) + Number(wd.amount) }).eq('id', wd.user_id);
      
      await supabaseAdmin.from('transactions').update({ status: 'rejected' }).eq('meta->>withdrawal_id', withdrawalId);

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Admin withdrawal action error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
      }
