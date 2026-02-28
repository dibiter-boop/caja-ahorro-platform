import { LoanScheduleRow, LoanSimulationInput } from '@/lib/domain/types';

function periodsByFrequency(input: LoanSimulationInput) {
  if (input.frequencyCode === '004') return input.termMonths;
  if (input.frequencyCode === '003') return input.termMonths * 2;
  return Math.round(input.termMonths * (input.weeklyFactor ?? 52 / 12));
}

function periodicRate(annualRate: number, periodsPerYear: number) {
  return annualRate / periodsPerYear;
}

export function simulateLoan(input: LoanSimulationInput) {
  const periods = periodsByFrequency(input);
  const periodsPerYear = input.frequencyCode === '004' ? 12 : input.frequencyCode === '003' ? 24 : 52;
  const rate = periodicRate(input.annualRate, periodsPerYear);
  const adminFeeRate = periodicRate(input.annualAdminFee, periodsPerYear);

  const annuity = rate === 0 ? input.amount / periods : (input.amount * rate) / (1 - Math.pow(1 + rate, -periods));

  const rows: LoanScheduleRow[] = [];
  let outstanding = input.amount;

  for (let period = 1; period <= periods; period += 1) {
    const interest = round2(outstanding * rate);
    const adminFee = round2(outstanding * adminFeeRate);
    const principal = period === periods ? round2(outstanding) : round2(Math.min(outstanding, annuity - interest));
    const payment = round2(principal + interest + adminFee);
    outstanding = round2(outstanding - principal);

    rows.push({ period, payment, principal, interest, adminFee });
  }

  return {
    periods,
    periodicRate: rate,
    paymentEstimate: round2(rows[0]?.payment ?? 0),
    totalInterest: round2(rows.reduce((acc, row) => acc + row.interest, 0)),
    totalAdminFee: round2(rows.reduce((acc, row) => acc + row.adminFee, 0)),
    schedule: rows
  };
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
