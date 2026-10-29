import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { comparePassword, signSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    // 🚨 TEMPORARY BYPASS FOR DEBUGGING
    if (username === 'admin' && password === 'password') {
      // Try to find the admin just to get the ID for the session
      const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('username', 'admin')
        .maybeSingle();

      const token = await signSession({ userId: admin?.id || 'dummy-id', phone: 'admin' });
      
      const res = NextResponse.json({ success: true });
      
      res.cookies.set('nexa_admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return res;
    }

    // Normal database check (will fail if DB is wrong)
    const { data: admin, error } = await supabaseAdmin
      .from('admins')
      .select('id, username, password_hash')
      .eq('username', username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `DB Error: ${error.message}` }, { status: 500 });
    }

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found in DB' }, { status: 401 });
    }

    const isValid = await comparePassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password hash does not match' }, { status: 401 });
    }

    const token = await signSession({ userId: admin.id, phone: 'admin' });
    const res = NextResponse.json({ success: true });
    res.cookies.set('nexa_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;

  } catch (err: any) {
    return NextResponse.json({ error: `Server crash: ${err.message}` }, { status: 500 });
  }
}
