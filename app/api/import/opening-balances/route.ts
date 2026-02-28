import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const rowSchema = z.object({
  razon_social_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  bucket_code: z.string().min(1),
  saldo_inicial: z.number()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = z.array(rowSchema).safeParse(body.rows ?? []);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('employee_bucket_opening_balances').upsert(parsed.data, { onConflict: 'employee_id,bucket_code' });
  if (error) return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });

  return NextResponse.json({ ok: true, imported: parsed.data.length });
}
