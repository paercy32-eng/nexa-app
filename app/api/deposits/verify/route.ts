export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { pesajet } from '@/lib/pesajet';

export async function POST(req: NextRequest) {
  try {
    const { reference, transactionId } = await req.json();

    if (!reference || !transactionId) {
      return NextResponse.json({ error: 'Missing reference or transactionId' }, { status: 400 });
    }

    // 1. Check our database first to see if the webhook already processed it
    const { data: deposit } = await supabaseAdmin
      .from('deposits')
      .select('id, user_id, status, amount')
      .eq('reference', reference)
      .maybeSingle();

    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    
    // If already completed, just tell the frontend
    if (deposit.status === 'completed') {
      return NextResponse.json({ status: 'completed' });
    }

    // 2. If still pending, ask PesaJet directly
    try {
      // We do a single quick check (not a 60-second wait)
      const tx = await pesajet.payments.pollUntilComplete(transactionId, { 
        intervalMs: 1000, 
        maxAttempts: 1 
      });

      if (tx.status === 'COMPLETED') {
        // 🚨 SUCCESS: Update database and credit the user
        await supabaseAdmin.from('deposits').update({ status: 'completed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'completed' }).eq('meta->>reference', reference);
        
        const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', deposit.user_id).single();
        if (user) {
          await supabaseAdmin
            .from('users')
            .update({ balance: Number(user.balance || 0) + Number(deposit.amount) })
            .eq('id', deposit.user_id);
        }
        
        return NextResponse.json({ status: 'completed' });
      }

      if (tx.status === 'FAILED' || tx.status === 'EXPIRED') {
        await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
        await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
        return NextResponse.json({ status: 'failed' });
      }

      // Still pending
      return NextResponse.json({ status: 'pending' });

    } catch (apiErr) {
      console.error('PesaJet check error:', apiErr);
      // If PesaJet throws an error (e.g., tx not found yet), just return pending so the frontend keeps trying
      return NextResponse.json({ status: 'pending' });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
