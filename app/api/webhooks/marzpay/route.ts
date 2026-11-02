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
      // 👈 Added 'success' checks just in case MarzPay uses that word
      const isSuccess = 
        eventType === 'collection.completed' || 
        eventType === 'collection.success' ||
        status === 'completed' || 
        status === 'success';
        
      const isFailure = 
        eventType === 'collection.failed' || 
        status === 'failed' || 
        eventType === 'collection.cancelled';

      if (isSuccess) {
        const amountToCredit = Number(deposit.amount);

        // 1. Update deposit status
        await supabaseAdmin
          .from('deposits')
          .update({ status: 'completed' })
          .eq('id', deposit.id);

        // 2. Fetch user and credit BOTH balance and total_deposited
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('balance, total_deposited')
          .eq('id', deposit.user_id)
          .single();

        if (user) {
          const newBalance = Number(user.balance || 0) + amountToCredit;
          const newTotalDeposited = Number(user.total_deposited || 0) + amountToCredit;

          await supabaseAdmin
            .from('users')
            .update({ 
              balance: newBalance,
              total_deposited: newTotalDeposited // 👈 Added this
            })
            .eq('id', deposit.user_id);
        }

        // 3. Update transaction log
        await supabaseAdmin
          .from('transactions')
          .update({ status: 'completed', amount: amountToCredit })
          .eq('meta->>reference', reference)
          .eq('type', 'deposit'); // 👈 Added type to prevent accidental updates to withdrawals

        console.log(`✅ MarzPay Deposit successful: Credited ${amountToCredit} to user ${deposit.user_id}`);

      } else if (isFailure) {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions')
          .update({ status: 'failed' })
          .eq('meta->>reference', reference)
          .eq('type', 'deposit');
          
        console.log(`❌ MarzPay Deposit failed for ref ${reference}`);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('MarzPay Webhook Error:', error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
