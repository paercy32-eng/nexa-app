export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Admin products fetch error:', error);
      return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
    }

    return NextResponse.json(
      { products: data ?? [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const session = await verifySession(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, action } = await req.json();

    if (!productId || action !== 'toggle_status') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get current status
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('is_active')
      .eq('id', productId)
      .single();

    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Toggle it
    const newStatus = !product.is_active;
    await supabaseAdmin
      .from('products')
      .update({ is_active: newStatus })
      .eq('id', productId);

    return NextResponse.json({ success: true, is_active: newStatus });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
