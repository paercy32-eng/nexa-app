export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { cookies } from 'next/headers';
import { verifySession } from '@/lib/auth';

// Helper to generate a random string (e.g., "CADB-8X9L2")
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

    const { quantity } = await req.json();
    const count = Number(quantity) || 10; // Default to 10 if not specified

    if (count > 100) return NextResponse.json({ error: 'Max 100 codes at a time.' }, { status: 400 });

    const newCodes = [];

    for (let i = 0; i < count; i++) {
      // Generate random amount between 50 and 700
      const randomAmount = Math.floor(Math.random() * (700 - 50 + 1)) + 50;
      
      newCodes.push({
        code: generateCode(),
        amount: randomAmount,
        is_used: false,
      });
    }

    // Insert all codes into Supabase
    const { data, error } = await supabaseAdmin
      .from('gift_codes')
      .insert(newCodes)
      .select('*');

    if (error) throw error;

    return NextResponse.json({ success: true, codes: data });
  } catch (err) {
    console.error('Generate codes error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
      }
