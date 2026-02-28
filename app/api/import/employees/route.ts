import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { parseCsvRows, validateEmployeeRows } from '@/lib/services/imports';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = parseCsvRows(body.csv);
  const supabase = createSupabaseServerClient();

  const { data: freqsData, error: freqError } = await supabase.from('payroll_frequencies').selectWhere({ activo: 'true' });
  if (freqError) {
    return NextResponse.json({ ok: false, errors: [{ row: 0, message: String(freqError) }] }, { status: 400 });
  }

  const validFrequencies = Array.isArray(freqsData)
    ? freqsData.map((item) => String((item as Record<string, unknown>).codigo_nomina))
    : [];

  const { ok, errors } = validateEmployeeRows(rows, validFrequencies);

  if (errors.length) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const { error } = await supabase.from('employee_profiles').upsert(ok, { onConflict: 'razon_social_id,empleado_num' });
  if (error) {
    return NextResponse.json({ ok: false, errors: [{ row: 0, message: String(error) }] }, { status: 400 });
  }

  return NextResponse.json({ ok: true, imported: ok.length, errors: [] });
}
