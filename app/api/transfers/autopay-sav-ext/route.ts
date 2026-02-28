import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const autopaySchema = z.object({
  razon_social_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  amount: z.number().positive()
});

export async function POST(req: NextRequest) {
  const parsed = autopaySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('autopay_sav_ext_to_loan', {
    p_razon_social_id: parsed.data.razon_social_id,
    p_employee_id: parsed.data.employee_id,
    p_amount: parsed.data.amount
  });

  if (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true, transfer_id: data });
}
