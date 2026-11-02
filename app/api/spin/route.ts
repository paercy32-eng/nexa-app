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
  // 1. Check if the user themselves has an Active Product
  const { count: activeProducts } = await supabaseAdmin
    .from('user_modules')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (!activeProducts || activeProducts === 0) {
    return { canSpin: false, reason: 'You need an active asset to spin.', invitesToday: 0 };
  }

  // 2. Check if they already spun today
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('last_spin_at, currency, last_spin_prize')
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

  // 3. Count Level 1 referrals who BECAME ACTIVE today (purchased today)
  // Calculate midnight EAT in UTC
  const nowEAT = new Date(nowUTC.getTime() + 3 * 60 * 60 * 1000);
  const startOfDayEAT = new Date(Date.UTC(
    nowEAT.getUTCFullYear(),
    nowEAT.getUTCMonth(),
    nowEAT.getUTCDate(),
    0, 0, 0, 0
  ).getTime() - 3 * 60 * 60 * 1000);

  // Step A: Get all users who were referred by this user
  const { data: referredUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('referred_by', userId);

  if (!referredUsers || referredUsers.length === 0) {
    return { canSpin: false, reason: 'You need 3 active invites today to spin. You have 0/3.', invitesToday: 0 };
  }

  const referredUserIds = referredUsers.map(u => u.id);

  // Step B: Check how many of those referrals bought an active asset TODAY
  const { count: invitesToday, error: countError } = await supabaseAdmin
    .from('user_modules')
    .select('id', { count: 'exact', head: true })
    .in('user_id', referredUserIds)
    .eq('status', 'active')
    .gte('created_at', startOfDayEAT.toISOString());

  if (countError) {
    console.error('Spin count error:', countError);
    return { canSpin: false, reason: 'Error checking invites.', invitesToday: 0 };
  }

  if (!invitesToday || invitesToday < 3) {
    return { 
      canSpin: false, 
      reason: `You need 3 active invites today to spin. You have ${invitesToday || 0}/3.`, 
      invitesToday: invitesToday || 0 
    };
  }

  return { canSpin: true, reason: '', invitesToday, lastPrize: user.last_spin_prize, currency: user.currency };
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

    const userCurrency = status.currency || 'UGX';
    const nowUTC = new Date();
    
    // 🚨 PRIZE POOL & NO REPEAT LOGIC
    const allPrizes = ['product', 'cash_5000', 'cash_10000', 'cash_20000'];
    const availablePrizes = allPrizes.filter(p => p !== status.lastPrize);
    const randomIndex = Math.floor(Math.random() * availablePrizes.length);
    const selectedPrize = availablePrizes[randomIndex];

    let prizeType = 'cash';
    let cashAmount = 0;
    let productWon = null;

    // Handle Product Win
    if (selectedPrize === 'product') {
      prizeType = 'product';
      
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('name', 'Nexa Flow Node')
        .maybeSingle();
      
      if (product) {
        productWon = product;
        const startedAt = new Date();
        const cycleDays = product.cycle_days || 60; 
        const prizeDailyReturn = 4000; 
        const expiresAt = new Date(startedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);
        
        await supabaseAdmin.from('user_modules').insert({
          user_id: session.userId,
          product_id: product.id,
          product_name: product.name,
          price_paid: 0,
          cycle_days: cycleDays,
          daily_return: prizeDailyReturn, 
          total_creditable: cycleDays * prizeDailyReturn,
          days_credited: 0,
          total_credited: 0,
          started_at: startedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'active',
          last_credited_at: startedAt.toISOString(),
        });
      }
    } 
    // Handle Cash Win
    else {
      prizeType = 'cash';
      let cashUGX = 5000;
      if (selectedPrize === 'cash_10000') cashUGX = 10000;
      if (selectedPrize === 'cash_20000') cashUGX = 20000;

      cashAmount = convertFromUGX(cashUGX, userCurrency);

      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', session.userId).single();
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(user?.balance || 0) + cashAmount })
        .eq('id', session.userId);
    }

    await supabaseAdmin
      .from('users')
      .update({ 
        last_spin_at: nowUTC.toISOString(),
        last_spin_prize: selectedPrize
      })
      .eq('id', session.userId);

    await supabaseAdmin.from('transactions').insert({
      user_id: session.userId,
      type: 'spin_win',
      amount: prizeType === 'cash' ? cashAmount : 0,
      status: 'completed',
      meta: { 
        prize_type: prizeType, 
        prize_key: selectedPrize,
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
