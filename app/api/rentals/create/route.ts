export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    // 1. Load user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*') 
      .eq('id', session.userId)
      .maybeSingle();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.is_banned) return NextResponse.json({ error: 'Account suspended' }, { status: 403 });

    // 2. Load product
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (!product.is_active) return NextResponse.json({ error: 'Product unavailable' }, { status: 400 });

    const price = Number(product.price);
    const cycleDays = product.cycle_days || 100;
    const dailyReturn = product.daily_return || 0;

    // 3. Check existing modules
    const { count: moduleCount } = await supabaseAdmin
      .from('user_modules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId);

    const isFirstPurchase = (moduleCount ?? 0) === 0;

    // 4. First purchase rules (Must be fully funded by approved deposits)
    if (isFirstPurchase) {
      const { data: deposits } = await supabaseAdmin
        .from('deposits') 
        .select('amount')
        .eq('user_id', session.userId)
        .in('status', ['completed', 'approved']); 

      const approvedTotal = (deposits ?? []).reduce(
        (sum, d) => sum + Number(d.amount),
        0
      );

      if (approvedTotal < price) {
        const missing = price - approvedTotal;
        return NextResponse.json(
          {
            error: `First purchase must be fully funded by approved deposits. You have ${approvedTotal.toLocaleString()} in deposits but need ${price.toLocaleString()}. Please deposit ${missing.toLocaleString()} more.`,
            reason: 'first_purchase_deposit_required',
          },
          { status: 400 }
        );
      }
    }

    // 5. Check balance
    if (Number(user.balance) < price) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${(price - Number(user.balance)).toLocaleString()} more.` },
        { status: 400 }
      );
    }

    // 6. Deduct balance
    await supabaseAdmin
      .from('users')
      .update({ balance: Number(user.balance) - price })
      .eq('id', session.userId);

    // 7. Create the module
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    const { data: newModule, error: moduleErr } = await supabaseAdmin
      .from('user_modules')
      .insert({
        user_id: session.userId,
        product_id: product.id,
        product_name: product.name,
        price_paid: price,
        cycle_days: cycleDays,
        daily_return: dailyReturn,
        total_creditable: cycleDays * dailyReturn,
        days_credited: 0,
        total_credited: 0,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select('id')
      .single();

    if (moduleErr || !newModule) {
      // Refund if insert fails
      await supabaseAdmin.from('users').update({ balance: Number(user.balance) }).eq('id', session.userId);
      return NextResponse.json({ error: `Module creation failed: ${moduleErr?.message}` }, { status: 500 });
    }

    // 8. Update total_invested
    await supabaseAdmin
      .from('users')
      .update({ total_invested: Number(user.total_invested || 0) + price })
      .eq('id', session.userId);

    // 9. Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'rental',
      amount: price,
      status: 'completed',
      meta: { product_id: product.id, product_name: product.name, module_id: newModule.id },
    });

    // 10. Pay referral commissions (Only on first purchase)
    if (isFirstPurchase && user.referred_by) {
      
      const payCommission = async (referrerId: string, amount: number, level: number) => {
        const { data: ref } = await supabaseAdmin.from('users').select('balance').eq('id', referrerId).single();
        if (!ref) return;

        await supabaseAdmin
          .from('users')
          .update({ balance: Number(ref.balance || 0) + amount })
          .eq('id', referrerId);

        await supabaseAdmin.from('transactions').insert({
          user_id: referrerId,
          type: 'referral',
          amount: amount,
          status: 'completed',
          meta: { referred_user_id: session.userId, level: level },
        });
      };

      // Level 1 (25%)
      await payCommission(user.referred_by, Math.round(price * 0.25), 1);

      // Level 2 (3%)
      const { data: l1User } = await supabaseAdmin.from('users').select('referred_by').eq('id', user.referred_by).single();
      if (l1User?.referred_by) {
        await payCommission(l1User.referred_by, Math.round(price * 0.03), 2);

        // Level 3 (1%)
        const { data: l2User } = await supabaseAdmin.from('users').select('referred_by').eq('id', l1User.referred_by).single();
        if (l2User?.referred_by) {
          await payCommission(l2User.referred_by, Math.round(price * 0.01), 3);
        }
      }
    }

    return NextResponse.json({
      success: true,
      rental: { id: newModule.id, product: product.name, dailyProfit: dailyReturn, durationDays: cycleDays },
    });
  } catch (err: any) {
    console.error('Rental create error:', err);
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
  }
