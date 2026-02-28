import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  loan_id: z.string().uuid(),
  approver_user_id: z.string().uuid(),
  approved_amount: z.number().positive(),
  approver_comment: z.string().optional(),
  first_due_date: z.string().date()
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('approve_loan_request', {
    p_loan_id: parsed.data.loan_id,
    p_approver_user_id: parsed.data.approver_user_id,
    p_approved_amount: parsed.data.approved_amount,
    p_approver_comment: parsed.data.approver_comment ?? '',
    p_first_due_date: parsed.data.first_due_date
  });

  if (error) return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  return NextResponse.json({ ok: true, loan_id: data });
}
