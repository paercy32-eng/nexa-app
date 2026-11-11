export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { pesajet } from '@/lib/pesajet';

export async function POST(req: NextRequest) {
  try {
    const { reference, transactionId } = await req.json();

    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 });
    }

    // 1. ALWAYS check our database first
    const { data: deposit } = await supabaseAdmin
      .from('deposits')
      .select('id, user_id, status, amount')
      .eq('reference', reference)
      .maybeSingle();

    if (!deposit) return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    
    if (deposit.status === 'completed') {
      return NextResponse.json({ status: 'completed' });
    }
    
    if (deposit.status === 'failed') {
      return NextResponse.json({ status: 'failed' });
    }

    // 2. If pending in DB, ask PesaJet directly (if we have an ID)
    if (transactionId) {
      try {
        const tx = await pesajet.payments.pollUntilComplete(transactionId, { 
          intervalMs: 1000, 
          maxAttempts: 1 
        });

        if (tx.status === 'COMPLETED') {
          // Fallback: If webhook was slow, we credit them manually here
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

        // ONLY mark as failed if PesaJet explicitly says it failed
        if (tx.status === 'FAILED' || tx.status === 'EXPIRED') {
          await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', deposit.id);
          await supabaseAdmin.from('transactions').update({ status: 'failed' }).eq('meta->>reference', reference);
          return NextResponse.json({ status: 'failed' });
        }
      } catch (apiErr) {
        console.error('PesaJet verify check error:', apiErr);
        // If PesaJet errors out, keep it pending so the frontend doesn't panic
      }
    }

    // Still pending...
    return NextResponse.json({ status: 'pending' });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
