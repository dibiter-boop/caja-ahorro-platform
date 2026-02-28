import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const rowSchema = z.object({
  razon_social_id: z.string().uuid(),
  frecuencia_codigo: z.string().min(3),
  fecha_pago: z.string().date(),
  anio_aplica: z.number().int(),
  mes_aplica: z.number().int().min(1).max(12),
  cutoff_datetime: z.string().datetime().optional()
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = z.array(rowSchema).safeParse(body.rows ?? []);
  if (!parsed.success) return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from('pay_calendar').upsert(parsed.data, { onConflict: 'razon_social_id,frecuencia_codigo,fecha_pago' });
  if (error) return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });

  return NextResponse.json({ ok: true, imported: parsed.data.length });
}
