import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { comparePassword, signSession, SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone, password } = await req.json();

    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone and password are required.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .select('id, name, phone, password_hash, is_banned')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: `DB Error: ${dbError.message}` }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: `User not found for phone: ${cleanPhone}` }, { status: 401 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
    }

    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ 
        error: `Password mismatch. (Hash starts with: ${user.password_hash.substring(0, 10)}...)` 
      }, { status: 401 });
    }

    const token = await signSession({
      userId: user.id,
      phone: user.phone,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
