export type BucketCode = 'SAV_ORD' | 'SAV_EXT' | 'INV_01' | 'LOAN';

export type Role = 'EMPLOYEE' | 'COMP_ADMIN' | 'COMP_APPROVER' | 'HR_REPORTS' | 'SUPERADMIN';

export interface EmployeeBalance {
  bucket: BucketCode;
  amount: number;
}

export interface LoanSimulationInput {
  amount: number;
  termMonths: number;
  annualRate: number;
  annualAdminFee: number;
  frequencyCode: '002' | '003' | '004';
  weeklyFactor?: number;
}

export interface LoanScheduleRow {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  adminFee: number;
}
