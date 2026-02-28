import { simulateLoan } from '@/lib/domain/loan';
import { Table } from '@/components/ui/table';

export default function MisPrestamosPage() {
  const rows = simulateLoan({ amount: 25000, termMonths: 12, annualRate: 0.13, annualAdminFee: 0.01, frequencyCode: '003' }).schedule.slice(0, 6);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mis préstamos</h1>
      <p className="text-slate-600">Estatus + tabla de amortización por frecuencia de nómina.</p>
      <Table>
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Periodo</th><th>Principal</th><th>Interés</th><th>Fee</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.period} className="border-b">
              <td className="py-2">{row.period}</td>
              <td>{row.principal.toFixed(2)}</td>
              <td>{row.interest.toFixed(2)}</td>
              <td>{row.adminFee.toFixed(2)}</td>
              <td>{row.payment.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
