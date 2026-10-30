import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const REWARD_TIERS = [
  { target: 300000, reward: 10000 },
  { target: 500000, reward: 20000 },
  { target: 1000000, reward: 45000 },
  { target: 2000000, reward: 100000 },
  { target: 3000000, reward: 160000 },
  { target: 5000000, reward: 300000 },
];

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const userId = session.userId;

    // 1. Fetch Team
    const { data: l1Data } = await supabaseAdmin.from('users').select('id').eq('referred_by', userId);
    const l1Ids = (l1Data ?? []).map(u => u.id);

    let level2: any[] = [];
    if (l1Ids.length > 0) {
      const { data: l2Data } = await supabaseAdmin.from('users').select('id').in('referred_by', l1Ids);
      level2 = l2Data ?? [];
    }
    const l2Ids = level2.map(u => u.id);

    let level3: any[] = [];
    if (l2Ids.length > 0) {
      const { data: l3Data } = await supabaseAdmin.from('users').select('id').in('referred_by', l2Ids);
      level3 = l3Data ?? [];
    }

    const allTeamIds = [...l1Ids, ...l2Ids, ...level3.map(u => u.id)];
    const teamSize = allTeamIds.length;

    // 2. Calculate Team Investment
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

    // 3. Check claimed tiers
    const { data: existingRewards } = await supabaseAdmin
      .from('transactions')
      .select('meta')
      .eq('user_id', userId)
      .eq('type', 'team_reward');

    const claimedTargets = new Set((existingRewards ?? []).map(r => Number(r.meta?.tier_target)));

    const tiers = REWARD_TIERS.map((tier) => ({
      target: tier.target,
      reward: tier.reward,
      isTargetHit: teamInvestment >= tier.target,
      isClaimed: claimedTargets.has(tier.target),
    }));

    return NextResponse.json(
      { teamInvestment, teamSize, tiers },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err) {
    console.error('Rewards API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
