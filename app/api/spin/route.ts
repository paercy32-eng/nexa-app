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

  // 3. Count Level 1 invites who became ACTIVE today
  const startOfDayUTC = new Date(nowUTC);
  startOfDayUTC.setUTCHours(0, 0, 0, 0); 
  // Note: 00:00 EAT is 21:00 UTC of the previous day. 
  // To keep it simple, we look for modules created in the last 24 hours, 
  // OR we can strictly use EAT. Let's use EAT.
  const startOfDayEAT = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000);
  startOfDayEAT.setUTCHours(0, 0, 0, 0);
  
  const { count: invitesToday } = await supabaseAdmin
    .from('user_modules')
    .select('user_id, users!inner(referred_by)', { count: 'exact', head: true })
    .eq('users.referred_by', userId)
    .eq('status', 'active')
    .gte('created_at', startOfDayEAT.toISOString());

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
    // Define all possible prizes
    const allPrizes = ['product', 'cash_5000', 'cash_10000', 'cash_20000'];
    
    // Remove the last won prize from the pool
    const availablePrizes = allPrizes.filter(p => p !== status.lastPrize);
    
    // Pick a random prize from the remaining pool
    const randomIndex = Math.floor(Math.random() * availablePrizes.length);
    const selectedPrize = availablePrizes[randomIndex];

    let prizeType = 'cash';
    let cashAmount = 0;
    let productWon = null;

    // Handle Product Win
    if (selectedPrize === 'product') {
      prizeType = 'product';
      
      // Fetch the Nexa Flow Node product to get its ID
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('name', 'Nexa Flow Node')
        .maybeSingle();
      
      if (product) {
        productWon = product;
        const startedAt = new Date();
        // Hardcode 60 days cycle for the prize if product isn't found, otherwise use product's cycle
        const cycleDays = product.cycle_days || 60; 
        // Hardcode 4000 daily return as requested (even if product base is different)
        const prizeDailyReturn = 4000; 
        const expiresAt = new Date(startedAt.getTime() + cycleDays * 24 * 60 * 60 * 1000);
        
        await supabaseAdmin.from('user_modules').insert({
          user_id: session.userId,
          product_id: product.id,
          product_name: product.name,
          price_paid: 0, // Won for free
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

      // Credit user balance
      const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', session.userId).single();
      await supabaseAdmin
        .from('users')
        .update({ balance: Number(user?.balance || 0) + cashAmount })
        .eq('id', session.userId);
    }

    // Mark as spun today AND save the prize they won
    await supabaseAdmin
      .from('users')
      .update({ 
        last_spin_at: nowUTC.toISOString(),
        last_spin_prize: selectedPrize
      })
      .eq('id', session.userId);

    // Log the transaction
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
