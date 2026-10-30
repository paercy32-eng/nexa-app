export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, userId, amount, reason, productId } = await req.json();

    if (!userId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    // 1. BAN / UNBAN
    if (action === 'ban') {
      const { data: user } = await supabaseAdmin.from('users').select('is_banned').eq('id', userId).single();
      await supabaseAdmin.from('users').update({ is_banned: !user?.is_banned }).eq('id', userId);
      return NextResponse.json({ success: true });
    }

    // 2. ADJUST BALANCE
    if (action === 'adjust') {
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
      const newBalance = Number(user?.balance || 0) + Number(amount);
      
      await supabaseAdmin.from('users').update({ balance: newBalance }).eq('id', userId);
      
      await supabaseAdmin.from('transactions').insert({
        user_id: userId,
        type: amount > 0 ? 'admin_credit' : 'admin_debit',
        amount: Math.abs(Number(amount)),
        status: 'completed',
        meta: { reason: reason || 'Admin adjustment' }
      });
      return NextResponse.json({ success: true });
    }

    // 3. GRANT PRODUCT
    if (action === 'grant') {
      if (!productId) return NextResponse.json({ error: 'No product selected' }, { status: 400 });

      // Fetch the product
      const { data: product, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (prodErr || !product) {
        return NextResponse.json({ error: `Product not found: ${prodErr?.message || 'Unknown error'}` }, { status: 404 });
      }

      const startedAt = new Date();
      const cycleDays = product.cycle_days || 100;
      const expiresAt = new Date(startedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);

      // Insert into user_modules
      const { error: insertErr } = await supabaseAdmin.from('user_modules').insert({
        user_id: userId,
        product_id: product.id,
        product_name: product.name,
        price_paid: 0,
        cycle_days: cycleDays,
        daily_return: product.daily_return,
        total_creditable: cycleDays * product.daily_return,
        days_credited: 0,
        total_credited: 0,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      });

      if (insertErr) {
        console.error('Grant error:', insertErr);
        return NextResponse.json({ error: `Database error: ${insertErr.message}` }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
