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

    // 1. Call the database function
    const { data: teamData, error: teamError } = await supabaseAdmin.rpc('get_team_details', { root_id: userId });

    if (teamError) throw teamError;

    // 2. Extract the counts
    const l1Count = teamData.l1_count || 0;
    const l2Count = teamData.l2_count || 0;
    const l3Count = teamData.l3_count || 0; // 👈 LEVEL 3 IS RIGHT HERE
    const teamSize = teamData.team_size || 0;
    const allIds = teamData.all_ids || [];

    // 3. Calculate Team Investment
    let teamInvestment = 0;
    if (allIds.length > 0) {
      const { data: modules } = await supabaseAdmin
        .from('user_modules')
        .select('price_paid')
        .in('user_id', allIds);

      if (modules) {
        teamInvestment = modules.reduce((sum, m) => sum + Number(m.price_paid || 0), 0);
      }
    }

    // 4. Check claimed tiers
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
      { 
        teamInvestment, 
        teamSize, 
        l1Count, 
        l2Count, 
        l3Count, // 👈 SENDING LEVEL 3 TO THE FRONTEND
        tiers
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (err) {
    console.error('Rewards API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
