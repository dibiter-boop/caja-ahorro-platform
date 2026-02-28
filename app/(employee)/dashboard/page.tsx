import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { mockBalances } from '@/lib/data/mock';

export default function EmployeeDashboardPage() {
  const loanBalance = mockBalances.find((item) => item.bucket === 'LOAN')?.amount ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard empleado</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {mockBalances.map((bucket) => (
          <Card key={bucket.bucket}>
            <p className="text-sm text-slate-500">{bucket.bucket}</p>
            <p className="text-2xl font-bold">${bucket.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-2">
        <h2 className="font-semibold">Deuda LOAN actual</h2>
        <p className="text-lg">${loanBalance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link className="rounded border px-3 py-1" href="/solicitar-prestamo">Solicitar préstamo</Link>
          <Link className="rounded border px-3 py-1" href="/mis-prestamos">Mis préstamos</Link>
          <Link className="rounded border px-3 py-1" href="/autopago">Autopago SAV_EXT → LOAN</Link>
          <Link className="rounded border px-3 py-1" href="/estado-cuenta">Estado de cuenta</Link>
        </div>
      </Card>
    </div>
  );
}
