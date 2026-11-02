export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Admin Session
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Get the data from the frontend
    const { depositId, action } = await req.json(); // action = 'approve' or 'reject'

    if (!depositId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // 3. Fetch the deposit record
    const { data: deposit, error: depError } = await supabaseAdmin
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depError || !deposit) {
      return NextResponse.json({ error: 'Deposit not found' }, { status: 404 });
    }

    if (deposit.status !== 'pending') {
      return NextResponse.json({ error: 'Deposit is already processed' }, { status: 400 });
    }

    // ==========================================
    // ACTION: APPROVE (Credit User)
    // ==========================================
    if (action === 'approve') {
      // A. Update deposit status to completed
      await supabaseAdmin.from('deposits').update({ status: 'completed' }).eq('id', depositId);
      
      // B. Update the transaction record
      await supabaseAdmin.from('transactions')
        .update({ status: 'completed' })
        .eq('reference', deposit.reference) // Using reference to find the pending transaction
        .eq('type', 'deposit');

      // C. Fetch current user balance to add to it
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance, total_deposited')
        .eq('id', deposit.user_id)
        .single();

      if (user) {
        const newBalance = Number(user.balance) + Number(deposit.amount);
        const newTotalDeposited = Number(user.total_deposited || 0) + Number(deposit.amount);

        // D. Credit the user
        await supabaseAdmin.from('users').update({ 
          balance: newBalance,
          total_deposited: newTotalDeposited
        }).eq('id', deposit.user_id);
      }

      return NextResponse.json({ success: true, message: 'Deposit approved and user credited.' });
    }

    // ==========================================
    // ACTION: REJECT (Mark as failed)
    // ==========================================
    if (action === 'reject') {
      // A. Update deposit status to failed
      await supabaseAdmin.from('deposits').update({ status: 'failed' }).eq('id', depositId);
      
      // B. Update the transaction record
      await supabaseAdmin.from('transactions')
        .update({ status: 'failed' })
        .eq('reference', deposit.reference)
        .eq('type', 'deposit');

      return NextResponse.json({ success: true, message: 'Deposit rejected.' });
    }

  } catch (err: any) {
    console.error('Admin deposit action error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
