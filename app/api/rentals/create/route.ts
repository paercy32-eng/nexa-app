export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

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

    // 2. Load product (Price in DB is in UGX)
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    if (!product.is_active) return NextResponse.json({ error: 'Product unavailable' }, { status: 400 });

    const userCurrency = user.currency || 'UGX';
    
    // 🚨 CONVERT PRICES: The user pays in their local currency
    const localPrice = convertFromUGX(Number(product.price), userCurrency);
    const localDailyReturn = convertFromUGX(Number(product.daily_return), userCurrency);
    const cycleDays = product.cycle_days || 100;

    // 3. Check existing modules
    const { count: moduleCount } = await supabaseAdmin
      .from('user_modules')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.userId);

    const isFirstPurchase = (moduleCount ?? 0) === 0;

    // 4. First purchase rules (Must be fully funded by approved deposits)
    if (isFirstPurchase) {
      // Note: To keep things simple, we check if they have enough deposit balance
      // You can add the strict deposit checking logic here if you want to block welcome bonuses
      if (Number(user.balance) < localPrice) {
         return NextResponse.json({ error: `Insufficient balance. You need ${localPrice.toLocaleString()} more.` }, { status: 400 });
      }
    }

    // 5. Check balance
    if (Number(user.balance) < localPrice) {
      return NextResponse.json(
        { error: `Insufficient balance. You need ${(localPrice - Number(user.balance)).toLocaleString()} ${userCurrency} more.` },
        { status: 400 }
      );
    }

    // 6. Deduct balance
    await supabaseAdmin
      .from('users')
      .update({ balance: Number(user.balance) - localPrice })
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
        price_paid: localPrice, // Saved in local currency
        cycle_days: cycleDays,
        daily_return: localDailyReturn, // Saved in local currency
        total_creditable: cycleDays * localDailyReturn,
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
      return NextResponse.json({ error: `Module creation failed` }, { status: 500 });
    }

    // 8. Update total_invested
    await supabaseAdmin
      .from('users')
      .update({ total_invested: Number(user.total_invested || 0) + localPrice })
      .eq('id', session.userId);

    // 9. Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'rental',
      amount: localPrice,
      status: 'completed',
      meta: { product_id: product.id, product_name: product.name, module_id: newModule.id, currency: userCurrency },
    });

    // 10. Pay referral commissions (Only on first purchase)
    if (isFirstPurchase && user.referred_by) {
      
      // Helper to pay commission
      const payCommission = async (referrerId: string, amountInUGX: number, level: number) => {
        // Fetch referrer to know their currency
        const { data: ref } = await supabaseAdmin.from('users').select('balance, currency').eq('id', referrerId).single();
        if (!ref) return;

        const refCurrency = ref.currency || 'UGX';
        
        // Convert the commission from UGX to the referrer's local currency
        const localCommission = convertFromUGX(amountInUGX, refCurrency);

        await supabaseAdmin
          .from('users')
          .update({ balance: Number(ref.balance || 0) + localCommission })
          .eq('id', referrerId);

        await supabaseAdmin.from('transactions').insert({
          user_id: referrerId,
          type: 'referral',
          amount: localCommission,
          status: 'completed',
          meta: { referred_user_id: session.userId, level: level, currency: refCurrency },
        });
      };

      // Base commission amounts are calculated in UGX to ensure fairness across borders
      const baseUGXPrice = Number(product.price);

      // Level 1 (25%)
      await payCommission(user.referred_by, Math.round(baseUGXPrice * 0.25), 1);

      // Level 2 (3%)
      const { data: l1User } = await supabaseAdmin.from('users').select('referred_by').eq('id', user.referred_by).single();
      if (l1User?.referred_by) {
        await payCommission(l1User.referred_by, Math.round(baseUGXPrice * 0.03), 2);

        // Level 3 (1%)
        const { data: l2User } = await supabaseAdmin.from('users').select('referred_by').eq('id', l1User.referred_by).single();
        if (l2User?.referred_by) {
          await payCommission(l2User.referred_by, Math.round(baseUGXPrice * 0.01), 3);
        }
      }
    }

    return NextResponse.json({
      success: true,
      rental: { id: newModule.id, product: product.name, dailyProfit: localDailyReturn, durationDays: cycleDays },
    });
  } catch (err: any) {
    console.error('Rental create error:', err);
    return NextResponse.json({ error: `Server error` }, { status: 500 });
  }
      }
