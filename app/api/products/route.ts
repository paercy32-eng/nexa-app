import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';
import { convertFromUGX } from '@/lib/currency';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    let userCurrency = 'UGX'; // Default to UGX if not logged in

    // 1. Try to get the user's session to find their currency
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      const session = await verifySession(token);
      if (session) {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('currency')
          .eq('id', session.userId)
          .maybeSingle();
        
        if (user?.currency) {
          userCurrency = user.currency;
        }
      }
    }

    // 2. Fetch the raw products (stored in UGX)
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Products fetch error:', error);
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
    }

    // 3. Convert the prices and daily returns to the user's currency
    const convertedProducts = (products ?? []).map(p => ({
      ...p,
      price: convertFromUGX(Number(p.price), userCurrency),
      daily_return: convertFromUGX(Number(p.daily_return), userCurrency),
    }));

    return NextResponse.json(
      { products: convertedProducts },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('Products endpoint error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
