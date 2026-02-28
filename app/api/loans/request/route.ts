import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const requestSchema = z.object({
  razon_social_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  requested_amount: z.number().positive(),
  term_months: z.number().int().positive().max(60),
  payroll_frequency_code: z.string().min(3),
  parameter_version: z.number().int().positive(),
  locked_loan_rate_annual: z.number().min(0),
  locked_admin_fee_annual: z.number().min(0)
});

export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const payload = [{ ...parsed.data, status: 'SUBMITTED' }];
  const { error } = await supabase.from('loans').upsert(payload);
  if (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  }

  await supabase.from('audit_log').upsert([
    {
      razon_social_id: parsed.data.razon_social_id,
      action: 'LOAN_REQUEST_SUBMITTED',
      entity_type: 'loan',
      detail: { employee_id: parsed.data.employee_id, amount: parsed.data.requested_amount }
    }
  ]);

  return NextResponse.json({ ok: true });
}
