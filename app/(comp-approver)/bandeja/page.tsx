import { Table } from '@/components/ui/table';

const queue = [
  { loanId: '1f85b6a2-56f3-4ec2-b5b4-e2d36974f001', folio: 'LN-2026-001', empleado: '100045', monto: 25000, plazo: 12, frecuencia: '003', estatus: 'SUBMITTED' },
  { loanId: '1f85b6a2-56f3-4ec2-b5b4-e2d36974f002', folio: 'LN-2026-002', empleado: '100188', monto: 18000, plazo: 10, frecuencia: '004', estatus: 'PREVALIDATED' }
];

export default function BandejaAprobacionPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Bandeja de aprobación de préstamos</h1>
      <p className="text-slate-600">Flujo E2E activo: submit → approval/reject → creación deuda LOAN + schedule amortización.</p>
      <p className="text-sm text-slate-500">APIs: POST /api/loans/approve y POST /api/loans/reject.</p>
      <Table>
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Folio</th><th>Loan ID</th><th>Empleado</th><th>Monto</th><th>Plazo</th><th>Frecuencia</th><th>Estatus</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((item) => (
            <tr key={item.folio} className="border-b">
              <td className="py-2">{item.folio}</td><td className="font-mono text-xs">{item.loanId}</td><td>{item.empleado}</td><td>{item.monto}</td><td>{item.plazo}</td><td>{item.frecuencia}</td><td>{item.estatus}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
