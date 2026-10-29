export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';
import { pesajet } from '@/lib/pesajet';
// import { marzpay } from '@/lib/marzpay'; // You will uncomment this when MarzPay is imported

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'pending';

    let query = supabaseAdmin
      .from('withdrawals')
      .select('*');

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Admin withdrawals fetch error:', error);
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
    }

    // Fetch user details for each withdrawal
    const userIds = Array.from(new Set((data ?? []).map((w) => w.user_id)));
    let userMap: Record<string, { name: string; phone: string; country: string }> = {};
    
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, country')
        .in('id', userIds);
      (users ?? []).forEach((u) => {
        userMap[u.id] = { name: u.name, phone: u.phone, country: u.country };
      });
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
    console.error('Admin withdrawals error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { withdrawalId, action } = await req.json();

    if (!withdrawalId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: wd } = await supabaseAdmin
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawalId)
      .maybeSingle();

    if (!wd) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
    if (wd.status !== 'pending') return NextResponse.json({ error: `Already ${wd.status}` }, { status: 400 });

    // ==============================
    // APPROVE
    // ==============================
    if (action === 'approve') {
      const userNet = Math.round(Number(wd.amount) * 0.84); // 16% fee

      try {
        // 🚨 ROUTING: PesaJet for UG, MarzPay for others
        if (wd.gateway === 'pesajet') {
           const formattedPhone = pesajet.utils.formatPhoneNumber(wd.recipient_phone);
           let provider = pesajet.utils.detectProvider(wd.recipient_phone);
           if (!provider) provider = 'mtn'; 

           const payout = await pesajet.payments.create({
             type: 'DISBURSEMENT',
             amount: userNet,
             currency: wd.currency,
             phoneNumber: formattedPhone,
             provider: provider,
             reference: crypto.randomUUID(),
             description: `Nexa Withdrawal for ${wd.recipient_name}`,
           });

           console.log('PesaJet Payout initiated:', payout.transactionId);
        } else {
           // 🚨 PLACEHOLDER FOR MARZPAY (Once you import the keys, you will add the MarzPay fetch logic here)
           console.log('MarzPay payout logic needs to be added here for', wd.currency);
           // throw new Error('MarzPay integration not yet complete');
        }

        // Update withdrawal status
        await supabaseAdmin
          .from('withdrawals')
          .update({ status: 'completed' })
          .eq('id', withdrawalId);

        // Update transaction log
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed', type: 'withdrawal' })
          .eq('meta->>withdrawal_id', withdrawalId);

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
