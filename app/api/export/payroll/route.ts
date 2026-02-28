import { NextRequest, NextResponse } from 'next/server';
import { buildAnsaWorkbook, buildDelimitedText } from '@/lib/services/exports';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const delimiter: string = body.delimiter ?? '\t';
  const format: 'xlsx' | 'txt' = body.format ?? 'txt';

  if (format === 'xlsx') {
    const buffer = await buildAnsaWorkbook(rows);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="ansa_ns.xlsx"'
      }
    });
  }

  const text = buildDelimitedText(rows, { delimiter });
  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ansa_ns.txt"'
    }
  });
}
