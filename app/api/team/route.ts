export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const userId = session.userId;

    // 1. Get user's referral code
    const { data: me } = await supabaseAdmin
      .from('users')
      .select('referral_code')
      .eq('id', userId)
      .single();

    // 2. Fetch Level 1
    const { data: l1Data } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, created_at')
      .eq('referred_by', userId);
    const level1 = l1Data ?? [];
    const l1Ids = level1.map(u => u.id);

    // 3. Fetch Level 2
    let level2: any[] = [];
    if (l1Ids.length > 0) {
      const { data: l2Data } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, created_at')
        .in('referred_by', l1Ids);
      level2 = l2Data ?? [];
    }
    const l2Ids = level2.map(u => u.id);

    // 4. Fetch Level 3
    let level3: any[] = [];
    if (l2Ids.length > 0) {
      const { data: l3Data } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, created_at')
        .in('referred_by', l2Ids);
      level3 = l3Data ?? [];
    }

    // 5. Check active pumps for validation
    const allReferredIds = [...l1Ids, ...l2Ids, ...level3.map(u => u.id)];
    let activePumpUserIds = new Set<string>();

    if (allReferredIds.length > 0) {
      const { data: activeModules } = await supabaseAdmin
        .from('user_modules')
        .select('user_id')
        .in('user_id', allReferredIds)
        .eq('status', 'active');

      activePumpUserIds = new Set((activeModules ?? []).map(m => m.user_id));
    }

    // 6. Calculate earnings from transactions
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('amount, meta')
      .eq('user_id', userId)
      .eq('type', 'referral');

    const earningsMap: Record<string, number> = {};
    let totalEarnings = 0;

    if (transactions) {
      transactions.forEach(tx => {
        const referredId = tx.meta?.referred_user_id;
        if (referredId) {
          earningsMap[referredId] = (earningsMap[referredId] || 0) + Number(tx.amount);
        }
        totalEarnings += Number(tx.amount);
      });
    }

    // 7. Format data
    const formatUsers = (users: any[]) => users.map(u => ({
      id: u.id,
      referred_id: u.id,
      name: u.name || 'User',
      phone: u.phone,
      created_at: u.created_at,
      joined_at: u.created_at,
      earnings: earningsMap[u.id] || 0,
      isValid: activePumpUserIds.has(u.id)
    }));

    return NextResponse.json({
      referralCode: me?.referral_code || 'N/A',
      totalEarnings: totalEarnings,
      counts: {
        level1: level1.length,
        level2: level2.length,
        level3: level3.length,
      },
      levels: {
        level1: formatUsers(level1),
        level2: formatUsers(level2),
        level3: formatUsers(level3),
      }
    });

  } catch (err) {
    console.error('Team API error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
      }
