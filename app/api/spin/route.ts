export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

// Helper: Get the YYYY-MM-DD string in East Africa Time (UTC+3)
function getEATDateString(date: Date) {
  const eatTime = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return eatTime.toISOString().split('T')[0];
}

// Helper: Check if user is eligible to spin
async function checkEligibility(userId: string) {
  // 1. Check for Active Product
  const { count: activeProducts } = await supabaseAdmin
    .from('user_modules')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!activeProducts || activeProducts === 0) {
    return { canSpin: false, reason: 'You need an active asset to spin.', invitesToday: 0 };
  }

  // 2. Check if already spun today
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('last_spin_at, currency')
    .eq('id', userId)
    .single();

  if (!user) return { canSpin: false, reason: 'User not found', invitesToday: 0 };

  const nowUTC = new Date();
  const todayEAT = getEATDateString(nowUTC);

  if (user.last_spin_at) {
    const lastSpinDate = new Date(user.last_spin_at);
    const lastSpinEAT = getEATDateString(lastSpinDate);
    if (lastSpinEAT === todayEAT) {
      return { canSpin: false, reason: 'You have already spun today. Come back tomorrow!', invitesToday: 0 };
    }
  }

  // 3. Count Level 1 invites who became ACTIVE today
  // Note: We look for user_modules created today where the user's referrer is this user.
  const startOfDay = new Date(nowUTC);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const { count: invitesToday } = await supabaseAdmin
    .from('user_modules')
    .select('user_id, users!inner(referred_by)', { count: 'exact', head: true })
    .eq('users.referred_by', userId)
    .eq('status', 'active')
    .gte('created_at', startOfDay.toISOString());

  if (!invitesToday || invitesToday < 3) {
    return { 
      canSpin: false, 
      reason: `You need 3 active invites today to spin. You have ${invitesToday || 0}/3.`, 
      invitesToday: invitesToday || 0 
    };
  }

  return { canSpin: true, reason: '', invitesToday };
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const status = await checkEligibility(session.userId);
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const status = await checkEligibility(session.userId);
    if (!status.canSpin) {
      return NextResponse.json({ error: status.reason }, { status: 400 });
    }

    // User is eligible. Let's spin!
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('currency, balance')
      .eq('id', session.userId)
      .single();

    const userCurrency = user?.currency || 'UGX';
    const nowUTC = new Date();

    // Prize Pool (1 in 10 chance for product, rest are cash)
    const random = Math.random();
    let prizeType = 'cash';
    let cashAmount = 0;
    let productWon = null;

    if (random < 0.10) {
      // Win the Product
      prizeType = 'product';
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('name', 'Nexa Flow Node')
        .maybeSingle();
      
      if (product) {
        productWon = product;
        // Grant the product
        const startedAt = new Date();
        const expiresAt = new Date(startedAt.getTime() + (product.cycle_days || 100) * 24 * 60 * 60 * 1000);
        
        await supabaseAdmin.from('user_modules').insert({
          user_id: session.userId,
          product_id: product.id,
          product_name: product.name,
          price_paid: 0, // Won for free
          cycle_days: product.cycle_days,
          daily_return: 4000, // 🚨 Custom daily return for spin prize
          total_creditable: (product.cycle_days || 100) * 4000,
          days_credited: 0,
          total_credited: 0,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
        });
      }
    } else {
      // Win Cash (5000, 10000, or 20000 UGX converted to local currency)
      const cashOptions = [5000, 10000, 20000];
      const selectedUGX = cashOptions[Math.floor(Math.random() * cashOptions.length)];
      cashAmount = convertFromUGX(selectedUGX, userCurrency);

      // Credit balance
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(user?.balance || 0) + cashAmount })
        .eq('id', session.userId);
    }

    // Mark as spun today
    await supabaseAdmin
      .from('users')
      .update({ last_spin_at: nowUTC.toISOString() })
      .eq('id', session.userId);

    // Log the transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'spin_win',
      amount: prizeType === 'cash' ? cashAmount : 0,
      status: 'completed',
      meta: { 
        prize_type: prizeType, 
        product_name: productWon?.name || null,
        product_daily: 4000
      },
    });

    return NextResponse.json({
      success: true,
      prize: {
        type: prizeType,
        amount: cashAmount,
        currency: userCurrency,
        productName: productWon?.name || null,
        productDaily: 4000
      }
    });

  } catch (err) {
    console.error('Spin error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
          }
