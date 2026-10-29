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

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ products: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('nexa_admin_session')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, productId } = body;

    if (!productId || !action) {
      return NextResponse.json({ error: 'Product ID and action required' }, { status: 400 });
    }

    // 1. Toggle Status (Active / Inactive)
    if (action === 'toggle_status') {
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('is_active')
        .eq('id', productId)
        .maybeSingle();

      if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

      await supabaseAdmin
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', productId);

      return NextResponse.json({ success: true });
    }

    // 2. Update Product Details (Name, Price, Returns, Image)
    if (action === 'update_details') {
      const { name, price, daily_return, cycle_days, image_url } = body;

      const updateData: Record<string, any> = {};
      if (name) updateData.name = name;
      if (price) updateData.price = Number(price);
      if (daily_return) updateData.daily_return = Number(daily_return);
      if (cycle_days) updateData.cycle_days = Number(cycle_days);
      if (image_url) updateData.image_url = image_url;

      const { error } = await supabaseAdmin
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    console.error('Admin product action error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
                              }
