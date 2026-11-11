export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

// 🚨 YOUR REWARD MAPPING
const PURCHASE_REWARDS: Record<number, number> = {
  20000: 3000,
  30000: 6000,
  50000: 8000,
  80000: 12000,
  100000: 15000,
  150000: 20000,
  250000: 25000,
  350000: 30000,
  // Others can be added here later
};

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });

    // 1. Get the product details
    const { data: product, error: prodError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (prodError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // 2. Get the user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('balance')
      .eq('id', session.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const price = Number(product.price);

    // 3. Check if the user has enough balance
    if (Number(user.balance) < price) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 4. Deduct the balance
    const newBalance = Number(user.balance) - price;
    await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('id', session.userId);

    // 5. Create the user module (the active investment)
    const startAt = new Date();
    const expiresAt = new Date(startAt.getTime() + product.cycle_days * 24 * 60 * 60 * 1000);

    const { error: moduleError } = await supabaseAdmin
      .from('user_modules')
      .insert({
        user_id: session.userId,
        product_id: product.id,
        product_name: product.name,
        price_paid: price,
        cycle_days: product.cycle_days,
        daily_return: product.daily_return,
        total_creditable: Number(product.daily_return) * product.cycle_days,
        days_credited: 0,
        total_credited: 0,
        started_at: startAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
        last_credited_at: startAt.toISOString(),
      });

    if (moduleError) throw moduleError;

    // 6. Log the investment transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      amount: price,
      type: 'investment',
      status: 'completed',
      meta: { product_id: product.id, product_name: product.name },
    });

    // 🚨 7. CHECK FOR PURCHASE REWARD AND CREDIT IT AUTOMATICALLY
    const rewardAmount = PURCHASE_REWARDS[price];

    if (rewardAmount) {
      // A. Fetch the latest balance (since we just deducted the price)
      const { data: updatedUser } = await supabaseAdmin
        .from('users')
        .select('balance')
        .eq('id', session.userId)
        .single();

      const finalBalance = Number(updatedUser?.balance || 0) + rewardAmount;

      // B. Add the reward to their balance
      await supabaseAdmin
        .from('users')
        .update({ balance: finalBalance })
        .eq('id', session.userId);

      // C. Log the reward transaction
      await supabaseAdmin.from('transactions').insert({
        user_id: session.userId,
        amount: rewardAmount,
        type: 'purchase_reward', // 👈 Special transaction type
        status: 'completed',
        meta: { product_name: product.name, reason: 'Instant cashback reward' },
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Investment successful!',
      reward: rewardAmount || 0
    });

  } catch (err: any) {
    console.error('Investment error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
        }
