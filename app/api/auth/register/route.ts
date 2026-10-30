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

// 🚨 Set the base welcome bonus to 2000 UGX
const BASE_WELCOME_BONUS_UGX = 2000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, password, confirmPassword, referralCode, country, currency } = body;

    // --- Validation ---
    if (!phone || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const cleanPhone = phone.trim();
    if (!/^\+?\d{9,15}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
    }

    // --- Check if phone already exists ---
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'This phone number is already registered.' }, { status: 409 });
    }

    // --- Resolve referrer ---
    let referredBy: string | null = null;
    if (referralCode && referralCode.trim()) {
      const { data: referrer } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .maybeSingle();
      if (referrer) referredBy = referrer.id;
    }

    // --- Hash password ---
    const passwordHash = await hashPassword(password);

    // --- Generate unique referral code ---
    let newCode = generateReferralCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: clash } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('referral_code', newCode)
        .maybeSingle();
      if (!clash) break;
      newCode = generateReferralCode();
    }

    // --- Auto-generate name ---
    const defaultName = 'User ' + cleanPhone.slice(-4);

    // 🚨 Convert the 2000 UGX welcome bonus to the user's local currency
    const localWelcomeBonus = convertFromUGX(BASE_WELCOME_BONUS_UGX, currency || 'UGX');

    // --- Insert user ---
    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('users')
      .insert({
        name: defaultName,
        phone: cleanPhone,
        password_hash: passwordHash,
        balance: localWelcomeBonus, // 🚨 Save the converted local amount
        referral_code: newCode,
        referred_by: referredBy,
        country: country || 'UG',
        currency: currency || 'UGX',
      })
      .select('id, name, phone, referral_code, currency')
      .single();

    if (insertErr || !newUser) {
      console.error('Insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
    }

    // --- Log the welcome bonus transaction ---
    await supabaseAdmin.from('transactions').insert({
      user_id: newUser.id,
      type: 'welcome_bonus',
      amount: localWelcomeBonus, // 🚨 Log the converted local amount
      status: 'completed',
      meta: { reason: 'Welcome bonus', base_ugx: BASE_WELCOME_BONUS_UGX },
    });

    // --- Create session cookie ---
    const token = await signSession({
      userId: newUser.id,
      phone: newUser.phone,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        referralCode: newUser.referral_code,
        currency: newUser.currency,
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
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
