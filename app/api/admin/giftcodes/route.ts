export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CADB-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { amount, maxUses } = await req.json();
    
    const codeAmount = Number(amount) || 5000;
    const codeMaxUses = Number(maxUses) || 10;

    const newCode = {
      code: generateCode(),
      amount: codeAmount,
      max_uses: codeMaxUses,
      times_used: 0,
      is_used: false // Keeping this for backwards compatibility, but times_used is what matters now
    };

    const { data, error } = await supabaseAdmin
      .from('gift_codes')
      .insert([newCode])
      .select('*');

    if (error) throw error;

    return NextResponse.json({ success: true, codes: data });
  } catch (err) {
    console.error('Generate codes error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
