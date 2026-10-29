import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// The fixed tiers for Nexa
const REWARD_TIERS = [
  { target: 100000, reward: 5000 },
  { target: 300000, reward: 10000 },
  { target: 500000, reward: 20000 },
  { target: 1000000, reward: 30000 },
  { target: 1500000, reward: 40000 },
  { target: 2000000, reward: 100000 },
];

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const userId = session.userId;

    // 1. Fetch Level 1 IDs
    const { data: l1Data } = await supabaseAdmin.from('users').select('id').eq('referred_by', userId);
    const l1Ids = (l1Data ?? []).map(u => u.id);

    // 2. Fetch Level 2 IDs
    let level2: any[] = [];
    if (l1Ids.length > 0) {
      const { data: l2Data } = await supabaseAdmin.from('users').select('id').in('referred_by', l1Ids);
      level2 = l2Data ?? [];
    }
    const l2Ids = level2.map(u => u.id);

    // 3. Fetch Level 3 IDs
    let level3: any[] = [];
    if (l2Ids.length > 0) {
      const { data: l3Data } = await supabaseAdmin.from('users').select('id').in('referred_by', l2Ids);
      level3 = l3Data ?? [];
    }

    // 4. Combine all IDs and calculate size
    const allTeamIds = [...l1Ids, ...l2Ids, ...level3.map(u => u.id)];
    const teamSize = allTeamIds.length;

    // 5. Calculate Team Investment
    let teamInvestment = 0;
    if (allTeamIds.length > 0) {
      const { data: modules } = await supabaseAdmin
        .from('user_modules')
        .select('price_paid')
        .in('user_id', allTeamIds);

      if (modules) {
        teamInvestment = modules.reduce((sum, m) => sum + Number(m.price_paid || 0), 0);
      }
    }

    // 6. Check and Pay Out Unlocked Rewards Automatically
    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
    let currentBalance = Number(user?.balance || 0);

    // Find which tiers have already been paid out to avoid double-paying
    const { data: existingRewards } = await supabaseAdmin
      .from('transactions')
      .select('meta')
      .eq('user_id', userId)
      .eq('type', 'team_reward');

    const claimedTargets = new Set((existingRewards ?? []).map(r => Number(r.meta?.tier_target)));

    const tiers = [];
    let newRewardsPaid = 0;

    for (const tier of REWARD_TIERS) {
      const isUnlocked = teamInvestment >= tier.target;
      
      if (isUnlocked && !claimedTargets.has(tier.target)) {
        // Add money to balance
        currentBalance += tier.reward;
        await supabaseAdmin.from('users').update({ balance: currentBalance }).eq('id', userId);

        // Log the transaction so they see it in History
        await supabaseAdmin.from('transactions').insert({
          user_id: userId,
          type: 'team_reward',
          amount: tier.reward,
          status: 'completed',
          meta: { tier_target: tier.target, description: `Team Reward Unlocked (${tier.target.toLocaleString()} target)` },
        });

        claimedTargets.add(tier.target);
        newRewardsPaid += tier.reward;
      }

      tiers.push({
        target: tier.target,
        reward: tier.reward,
        isClaimed: claimedTargets.has(tier.target),
      });
    }

    return NextResponse.json(
      {
        teamInvestment,
        teamSize,
        tiers,
        newlyPaid: newRewardsPaid 
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err) {
    console.error('Rewards API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
                                                               }
