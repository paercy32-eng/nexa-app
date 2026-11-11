import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all active modules that haven't finished their cycle
    const { data: activeModules, error: fetchError } = await supabaseAdmin
      .from('user_modules')
      .select('*')
      .eq('status', 'active');

    if (fetchError) throw fetchError;
    if (!activeModules || activeModules.length === 0) {
      return NextResponse.json({ message: 'No active modules to credit today.' });
    }

    let creditedCount = 0;

    // 2. Loop through each active module and pay the user
    for (const mod of activeModules) {
      // If they have already received all their days, mark as completed
      if (mod.days_credited >= mod.cycle_days) {
        await supabaseAdmin
          .from('user_modules')
          .update({ status: 'completed' })
          .eq('id', mod.id);
        continue;
      }

      // A. Credit the user's balance
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', mod.user_id)
        .single();

      if (user) {
        const newBalance = Number(user.balance) + Number(mod.daily_return);
        await supabaseAdmin
          .from('users')
          .update({ balance: newBalance })
          .eq('id', mod.user_id);
      }

      // B. Update the module's progress
      const newDaysCredited = mod.days_credited + 1;
      const newTotalCredited = Number(mod.total_credited) + Number(mod.daily_return);
      const newStatus = newDaysCredited >= mod.cycle_days ? 'completed' : 'active';

      await supabaseAdmin
        .from('user_modules')
        .update({
          days_credited: newDaysCredited,
          total_credited: newTotalCredited,
          last_credited_at: new Date().toISOString(),
          status: newStatus,
        })
        .eq('id', mod.id);

      // C. Log the transaction
      await supabaseAdmin.from('transactions').insert({
        user_id: mod.user_id,
        amount: mod.daily_return,
        type: 'daily_yield',
        status: 'completed',
        meta: { module_id: mod.id, product_name: mod.product_name },
      });

      creditedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully credited daily profits to ${creditedCount} modules.` 
    });

  } catch (err: any) {
    console.error('Cron payout error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
