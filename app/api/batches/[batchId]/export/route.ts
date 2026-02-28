import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildAnsaWorkbook, buildDelimitedText } from '@/lib/services/exports';

export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  const body = await req.json().catch(() => ({}));
  const format: 'xlsx' | 'txt' = body.format ?? 'txt';
  const delimiter: string = body.delimiter ?? '\t';

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc('get_ansa_layout_rows', { p_batch_id: params.batchId });

  if (error) {
    return NextResponse.json({ ok: false, message: String(error) }, { status: 400 });
  }

  const rows = Array.isArray(data) ? (data as Record<string, string>[]) : [];

  if (format === 'xlsx') {
    const buffer = await buildAnsaWorkbook(rows);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ansa_ns_${params.batchId}.xlsx"`
      }
    });
  }

  const text = buildDelimitedText(rows, { delimiter });
  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="ansa_ns_${params.batchId}.txt"`
    }
  });
}
