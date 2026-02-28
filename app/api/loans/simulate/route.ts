import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simulateLoan } from '@/lib/domain/loan';

const simulateSchema = z.object({
  amount: z.number().positive(),
  termMonths: z.number().int().positive().max(60),
  annualRate: z.number().min(0).max(1),
  annualAdminFee: z.number().min(0).max(1),
  frequencyCode: z.enum(['002', '003', '004'])
});

export async function POST(req: NextRequest) {
  const parsed = simulateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: parsed.error.issues }, { status: 400 });
  }

  const result = simulateLoan(parsed.data);
  return NextResponse.json({ ok: true, simulation: result });
}
