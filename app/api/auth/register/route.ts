import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword, signSession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'NEXA-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password, confirmPassword, referralCode, country, currency } = body;

    if (!phone || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 });
    }

    let referredBy: string | null = null;
    if (referralCode && referralCode.trim()) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();
      if (referrer) referredBy = referrer.id;
    }

    const passwordHash = await hashPassword(password);
    const newCode = generateReferralCode();
    const defaultName = 'User ' + cleanPhone.slice(-4);

    // 🚨 THE CONVERSION LOGIC
    const userCurrency = currency || 'UGX';
    const localWelcomeBonus = convertFromUGX(2000, userCurrency);
    
    console.log(`🚨 CONVERTING: 2000 UGX to ${userCurrency} = ${localWelcomeBonus}`);

    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        name: defaultName,
        phone: cleanPhone,
        password_hash: passwordHash,
        balance: localWelcomeBonus, // 🚨 SAVING THE CONVERTED AMOUNT
        referral_code: newCode,
        referred_by: referredBy,
        country: country || 'UG',
        currency: userCurrency,
      })
      .select('id, name, phone, referral_code, currency')
      .single();

    if (insertErr || !newUser) {
      return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 });
    }

    await supabaseAdmin.from('transactions').insert({
      user_id: newUser.id,
      type: 'welcome_bonus',
      amount: localWelcomeBonus,
      status: 'completed',
      meta: { reason: 'Welcome bonus' },
    });

    const token = await signSession({ userId: newUser.id, phone: newUser.phone });
    const res = NextResponse.json({ success: true, user: newUser });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
