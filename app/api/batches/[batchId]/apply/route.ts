import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: { batchId: string } }) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('apply_payroll_batch', { p_batch_id: params.batchId });

  if (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affected_transactions: data });
}
