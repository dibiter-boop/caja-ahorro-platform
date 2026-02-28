import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const schema = z.object({
  results: z.array(
    z.object({
      employee_id: z.string().uuid(),
      status: z.enum(['PENDING', 'APPLIED', 'CANCELLED']),
      error_message: z.string().optional()
    })
  )
});

export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('import_payroll_batch_results', {
    p_batch_id: params.batchId,
    p_results: parsed.data.results
  });

  if (error) return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  return NextResponse.json({ ok: true, cancelled_rows: data });
}
