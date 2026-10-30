import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { pesajet } from '@/lib/pesajet';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const signature = req.headers.get('x-webhook-signature') || '';
    const rawBody = await req.text(); 
    
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // 2. Verify Signature
    const isValid = pesajet.webhooks.verify(rawBody, signature);
    if (!isValid) {
      console.error('Invalid PesaJet webhook signature');
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    const { event, status, reference, amount } = body;
    console.log(`Received PesaJet webhook: ${event} for ref ${reference} (${status})`);

    const isSuccess = event === 'payment.completed' || status === 'COMPLETED';
    const isFailure = event === 'payment.failed' || status === 'FAILED' || status === 'EXPIRED';

    if (!isSuccess && !isFailure) {
      return NextResponse.json({ received: true }); 
    }

    // ==========================================
    // A. HANDLE DEPOSITS (COLLECTION)
    // ==========================================
    // We check the 'deposits' table
    const { data: deposit } = await supabaseAdmin
      .from('deposits')
      .select('id, user_id, status, amount')
      .eq('reference', reference)
      .maybeSingle();

    if (deposit && deposit.status === 'pending') {
      if (isSuccess) {
        // 1. Update deposit status
        await supabaseAdmin
          .from('deposits')
          .update({ status: 'completed' })
          .eq('id', deposit.id);

        // 2. Credit user balance
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', deposit.user_id)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({ balance: Number(user.balance || 0) + Number(deposit.amount) })
            .eq('id', deposit.user_id);
        }

        // 3. Update transaction log
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('meta->>reference', reference);

        console.log(`✅ PesaJet Deposit successful: Credited ${deposit.amount} to user ${deposit.user_id}`);
      } else {
        // Mark as failed
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
        console.log(`❌ PesaJet Deposit failed for ref ${reference}`);
      }
      return NextResponse.json({ received: true });
    }

    // ==========================================
    // B. HANDLE WITHDRAWALS (DISBURSEMENT)
    // ==========================================
    const { data: withdrawal } = await supabaseAdmin
      .from('withdrawals')
      .select('id, user_id, amount, status')
      .filter('meta->>payout_reference', 'eq', reference)
      .maybeSingle();

    if (withdrawal && withdrawal.status === 'approved') {
      if (isSuccess) {
        await supabaseAdmin
          .from('withdrawals')
          .update({ status: 'completed' })
          .eq('id', withdrawal.id);
          
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed' })
          .eq('meta->>withdrawal_id', withdrawal.id);

        console.log(`✅ Withdrawal ${withdrawal.id} successfully paid out.`);
      } else {
        // Refund user if payout fails
        await supabaseAdmin
          .from('withdrawals')
          .update({ status: 'failed' })
          .eq('id', withdrawal.id);

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', withdrawal.user_id)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({ balance: Number(user.balance || 0) + Number(withdrawal.amount) })
            .eq('id', withdrawal.user_id);
        }

        await supabaseAdmin
          .from('transactions')
          .update({ status: 'failed', type: 'withdrawal_failed' })
          .eq('meta->>withdrawal_id', withdrawal.id);

        console.log(`❌ Withdrawal failed: Refunded ${withdrawal.amount} to user ${withdrawal.user_id}`);
      }
      return NextResponse.json({ received: true });
    }

    console.log(`Webhook reference ${reference} not found in database.`);
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('PesaJet Webhook Error:', error);
    return NextResponse.json({ received: true });
  }
      }
