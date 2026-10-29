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

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('bound_phone, bound_name')
      .eq('id', session.userId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      boundPhone: user?.bound_phone || '',
      boundName: user?.bound_name || '',
    });
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

    const { phone, fullName } = await req.json();

    if (!phone || !fullName) {
      return NextResponse.json({ error: 'Phone number and full name are required.' }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    const cleanName = String(fullName).trim();

    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({
        bound_phone: cleanPhone,
        bound_name: cleanName,
      })
      .eq('id', session.userId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      boundPhone: cleanPhone,
      boundName: cleanName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
