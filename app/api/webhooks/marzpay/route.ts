import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🚨 MARZPAY WEBHOOK RECEIVED:", JSON.stringify(body, null, 2));

    const payload = body.data ? body.data : body;
    const eventType = body.event_type || payload.event_type;
    const transaction = payload.transaction;
    
    if (!transaction || !transaction.reference) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const reference = transaction.reference;
    const status = transaction.status;

    // 1. Find the deposit record
    const { data: deposit } = await supabaseAdmin
      .from('deposits')
      .select('id, user_id, status, amount')
      .eq('reference', reference)
      .maybeSingle();

    if (!deposit) return NextResponse.json({ received: true }, { status: 200 });

    if (deposit.status === 'pending') {
      const isSuccess = eventType === 'collection.completed' || status === 'completed';
      const isFailure = eventType === 'collection.failed' || status === 'failed' || eventType === 'collection.cancelled';

      if (isSuccess) {
        // 🚨 CREDIT THE ORIGINAL REQUESTED AMOUNT (e.g. 500), NOT the gross amount (505)
        const amountToCredit = Number(deposit.amount);

        await supabaseAdmin
          .from('deposits')
          .update({ status: 'completed' })
          .eq('id', deposit.id);

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('balance')
          .eq('id', deposit.user_id)
          .single();

        if (user) {
          await supabaseAdmin
            .from('users')
            .update({ balance: Number(user.balance || 0) + amountToCredit })
            .eq('id', deposit.user_id);
        }

        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed', amount: amountToCredit })
          .eq('meta->>reference', reference);

        console.log(`✅ MarzPay Deposit successful: Credited ${amountToCredit} to user ${deposit.user_id}`);

      } else if (isFailure) {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('MarzPay Webhook Error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
