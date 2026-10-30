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

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const { target } = await req.json();
    const tier = REWARD_TIERS.find(t => t.target === Number(target));

    if (!tier) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });

    // 1. Verify user actually hit the target
    const userId = session.userId;
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

    if (teamInvestment < tier.target) {
      return NextResponse.json({ error: 'Target not reached yet' }, { status: 400 });
    }

    // 2. Check if already claimed
    const { data: existing } = await supabaseAdmin
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'team_reward')
      .eq('meta->>tier_target', String(tier.target))
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    // 3. Credit balance
    const { data: user } = await supabaseAdmin.from('users').select('balance').eq('id', userId).single();
    await supabaseAdmin
      .from('users')
      .update({ balance: Number(user?.balance || 0) + tier.reward })
      .eq('id', userId);

    // 4. Log transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'team_reward',
      amount: tier.reward,
      status: 'completed',
      meta: { tier_target: tier.target, description: `Team Reward Unlocked (${tier.target.toLocaleString()} target)` },
    });

    return NextResponse.json({ success: true, reward: tier.reward });

  } catch (err: any) {
    console.error('Claim API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
