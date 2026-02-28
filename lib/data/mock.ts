import { EmployeeBalance } from '@/lib/domain/types';

export const mockBalances: EmployeeBalance[] = [
  { bucket: 'SAV_ORD', amount: 18500.25 },
  { bucket: 'SAV_EXT', amount: 5300.1 },
  { bucket: 'INV_01', amount: 0 },
  { bucket: 'LOAN', amount: 12400.45 }
];

export const mockMovements = [
  { fecha: '2026-02-01', bucket: 'SAV_ORD', tipo: 'PAYROLL_CONTRIBUTION', importe: 550, estatus: 'APPLIED' },
  { fecha: '2026-02-05', bucket: 'SAV_EXT', tipo: 'EXTRA_CONTRIBUTION', importe: 1200, estatus: 'APPLIED' },
  { fecha: '2026-02-15', bucket: 'LOAN', tipo: 'LOAN_PAYMENT', importe: -1600, estatus: 'PENDING' }
];
